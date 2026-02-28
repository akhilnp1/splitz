"""
Core business logic for expense splitting and settlement calculation.
"""
import decimal
from collections import defaultdict
from typing import Dict, List


def calculate_splits(expense, participants: list, split_type: str, custom_amounts: dict = None):
    """
    Calculate how much each participant owes for an expense.
    
    Args:
        expense: The Expense instance
        participants: List of User instances who share this expense
        split_type: 'EQUAL', 'EXACT', or 'PERCENTAGE'
        custom_amounts: Dict {user_id: amount} for EXACT/PERCENTAGE splits
    
    Returns:
        Dict {user_id: Decimal amount_owed}
    """
    total = expense.amount
    splits = {}

    if split_type == 'EQUAL':
        if not participants:
            raise ValueError("At least one participant is required.")
        # Use integer division then distribute remainder fairly
        n = len(participants)
        per_person = (total / n).quantize(decimal.Decimal('0.01'))
        total_assigned = per_person * n
        remainder = total - total_assigned

        for i, user in enumerate(participants):
            amount = per_person
            if i == 0:  # Give remainder to first participant (the payer, usually)
                amount += remainder
            splits[user.id] = amount

    elif split_type == 'EXACT':
        if not custom_amounts:
            raise ValueError("Exact amounts required for EXACT split.")
        total_custom = sum(decimal.Decimal(str(v)) for v in custom_amounts.values())
        if abs(total_custom - total) > decimal.Decimal('0.01'):
            raise ValueError(
                f"Exact amounts ({total_custom}) must sum to total ({total})."
            )
        for user in participants:
            splits[user.id] = decimal.Decimal(str(custom_amounts.get(user.id, 0)))

    elif split_type == 'PERCENTAGE':
        if not custom_amounts:
            raise ValueError("Percentages required for PERCENTAGE split.")
        total_pct = sum(decimal.Decimal(str(v)) for v in custom_amounts.values())
        if abs(total_pct - decimal.Decimal('100')) > decimal.Decimal('0.01'):
            raise ValueError(f"Percentages must sum to 100, got {total_pct}.")
        for user in participants:
            pct = decimal.Decimal(str(custom_amounts.get(user.id, 0)))
            splits[user.id] = (total * pct / 100).quantize(decimal.Decimal('0.01'))

    return splits


def calculate_group_balances(group) -> List[dict]:
    """
    Calculate each member's net balance in the group.
    
    Positive balance = others owe you money (you paid more than your share)
    Negative balance = you owe others money (you paid less than your share)
    
    Returns list of: {user_id, username, email, balance}
    """
    from expenses.models import Expense, ExpenseSplit, Repayment

    # Net balance per user: amount_paid - amount_owed
    balances = defaultdict(decimal.Decimal)

    # Initialize all members with 0
    for member in group.members.all():
        balances[member.id] = decimal.Decimal('0')

    # Add amounts each person paid
    for expense in Expense.objects.filter(group=group).select_related('paid_by'):
        balances[expense.paid_by.id] += expense.amount

    # Subtract each person's share
    for split in ExpenseSplit.objects.filter(
        expense__group=group
    ).select_related('user'):
        balances[split.user.id] -= split.amount_owed

    # Account for repayments: payer gets credit, recipient gets debit
    for repayment in Repayment.objects.filter(group=group).select_related('paid_by', 'paid_to'):
        balances[repayment.paid_by.id] += repayment.amount
        balances[repayment.paid_to.id] -= repayment.amount

    # Build result list
    from users.models import User
    result = []
    for member in group.members.all():
        result.append({
            'user_id': member.id,
            'username': member.username,
            'email': member.email,
            'balance': str(balances[member.id].quantize(decimal.Decimal('0.01'))),
        })

    return result


def calculate_settlements(group) -> List[dict]:
    """
    Use the 'greedy' algorithm to compute the minimum number of transactions
    needed to settle all debts in the group.
    
    This is the classic "Simplify Debts" algorithm:
    1. Compute net balance for each person
    2. Separate into creditors (positive) and debtors (negative)
    3. Greedily match largest debtor with largest creditor
    
    Returns list of: {from_user, to_user, amount}
    """
    balances_data = calculate_group_balances(group)

    # Build {user_id -> balance} map
    balance_map = {
        item['user_id']: decimal.Decimal(item['balance'])
        for item in balances_data
    }

    # Separate into creditors and debtors
    creditors = []  # (amount, user_id) — people owed money
    debtors = []    # (amount, user_id) — people who owe money

    for user_id, balance in balance_map.items():
        if balance > decimal.Decimal('0.005'):
            creditors.append([balance, user_id])
        elif balance < decimal.Decimal('-0.005'):
            debtors.append([abs(balance), user_id])

    # Sort descending to process largest balances first
    creditors.sort(reverse=True)
    debtors.sort(reverse=True)

    settlements = []
    i, j = 0, 0

    # Build a quick user lookup
    from users.models import User
    user_ids = [item['user_id'] for item in balances_data]
    users = {u.id: u for u in User.objects.filter(id__in=user_ids)}

    while i < len(debtors) and j < len(creditors):
        debt_amount, debtor_id = debtors[i]
        credit_amount, creditor_id = creditors[j]

        # The settlement amount is the minimum of the two
        settlement_amount = min(debt_amount, credit_amount)

        if settlement_amount > decimal.Decimal('0.005'):
            debtor = users[debtor_id]
            creditor = users[creditor_id]
            settlements.append({
                'from_user': {
                    'id': debtor_id,
                    'username': debtor.username,
                    'email': debtor.email,
                },
                'to_user': {
                    'id': creditor_id,
                    'username': creditor.username,
                    'email': creditor.email,
                },
                'amount': str(settlement_amount.quantize(decimal.Decimal('0.01'))),
            })

        # Reduce balances
        debtors[i][0] -= settlement_amount
        creditors[j][0] -= settlement_amount

        # Move pointer if balance is settled
        if debtors[i][0] < decimal.Decimal('0.005'):
            i += 1
        if creditors[j][0] < decimal.Decimal('0.005'):
            j += 1

    return settlements