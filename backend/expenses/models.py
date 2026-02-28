from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
import decimal


class Expense(models.Model):
    SPLIT_CHOICES = [
        ('EQUAL', 'Equal Split'),
        ('EXACT', 'Exact Amounts'),
        ('PERCENTAGE', 'Percentage'),
    ]

    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='expenses'
    )
    description = models.CharField(max_length=255)
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(decimal.Decimal('0.01'))]
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='paid_expenses'
    )
    split_type = models.CharField(max_length=20, choices=SPLIT_CHOICES, default='EQUAL')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.description} - ${self.amount}"

    class Meta:
        ordering = ['-created_at']


class ExpenseSplit(models.Model):
    """Represents a single person's share of an expense."""
    expense = models.ForeignKey(
        Expense, on_delete=models.CASCADE, related_name='splits'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_splits'
    )
    amount_owed = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(decimal.Decimal('0.00'))]
    )
    is_settled = models.BooleanField(default=False)

    class Meta:
        unique_together = ('expense', 'user')

    def __str__(self):
        return f"{self.user.email} owes ${self.amount_owed} for {self.expense.description}"


class Repayment(models.Model):
    """Records when someone pays back a debt."""
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='repayments'
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='repayments_made'
    )
    paid_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='repayments_received'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(decimal.Decimal('0.01'))]
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.paid_by.email} paid {self.paid_to.email} ${self.amount}"

    class Meta:
        ordering = ['-created_at']