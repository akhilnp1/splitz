from rest_framework import serializers
from decimal import Decimal
from .models import Expense, ExpenseSplit, Repayment
from users.serializers import UserSerializer


class ExpenseSplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ExpenseSplit
        fields = ['id', 'user', 'amount_owed', 'is_settled']


class ExpenseSerializer(serializers.ModelSerializer):
    splits = ExpenseSplitSerializer(many=True, read_only=True)
    paid_by = UserSerializer(read_only=True)
    paid_by_id = serializers.IntegerField(write_only=True)
    created_by = UserSerializer(read_only=True)

    # Write fields for creating expense
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text="List of user IDs who share this expense."
    )
    custom_amounts = serializers.DictField(
        child=serializers.DecimalField(max_digits=10, decimal_places=2),
        required=False,
        write_only=True,
        help_text="For EXACT/PERCENTAGE splits: {user_id: amount}"
    )

    class Meta:
        model = Expense
        fields = [
            'id', 'group', 'description', 'amount', 'paid_by', 'paid_by_id',
            'split_type', 'splits', 'created_by', 'notes',
            'participant_ids', 'custom_amounts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'group']  # ✅ group added here

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, attrs):
        request = self.context['request']
        view = self.context['view']
        
        # Get group from the URL (kwargs), not from request body
        group_id = view.kwargs.get('group_id')
        try:
            from groups.models import Group
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise serializers.ValidationError({"group": "Group not found."})

        # Verify requesting user is a group member
        if not group.members.filter(id=request.user.id).exists():
            raise serializers.ValidationError(
                {"group": "You are not a member of this group."}
            )

        # Verify paid_by user is a group member
        paid_by_id = attrs.get('paid_by_id')
        if paid_by_id and not group.members.filter(id=paid_by_id).exists():
            raise serializers.ValidationError(
                {"paid_by_id": "The payer must be a member of the group."}
            )

        # Verify all participants are group members
        participant_ids = attrs.get('participant_ids', [])
        if participant_ids:
            non_members = [
                uid for uid in participant_ids
                if not group.members.filter(id=uid).exists()
            ]
            if non_members:
                raise serializers.ValidationError(
                    {"participant_ids": f"These users are not group members: {non_members}"}
                )

        return attrs

    def create(self, validated_data):
        from users.models import User
        from .services import calculate_splits

        participant_ids = validated_data.pop('participant_ids')
        custom_amounts = validated_data.pop('custom_amounts', None)
        paid_by_id = validated_data.pop('paid_by_id')

        paid_by_user = User.objects.get(id=paid_by_id)
        participants = list(User.objects.filter(id__in=participant_ids))

        expense = Expense.objects.create(
            paid_by=paid_by_user,
            created_by=self.context['request'].user,
            **validated_data
        )

        # Calculate how much each participant owes
        splits = calculate_splits(
            expense, participants,
            expense.split_type,
            custom_amounts
        )

        # Create ExpenseSplit records
        for user in participants:
            amount = splits.get(user.id, Decimal('0'))
            if amount > 0:
                ExpenseSplit.objects.create(
                    expense=expense,
                    user=user,
                    amount_owed=amount
                )

        return expense


class RepaymentSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    paid_to = UserSerializer(read_only=True)
    paid_to_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Repayment
        fields = [
            'id', 'group', 'paid_by', 'paid_to', 'paid_to_id',
            'amount', 'note', 'created_at'
        ]
        read_only_fields = ['id', 'paid_by', 'created_at', 'group']  # ✅ group added

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, attrs):
        request = self.context['request']
        view = self.context['view']

        # Get group from URL, not request body
        group_id = view.kwargs.get('group_id')
        try:
            from groups.models import Group
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise serializers.ValidationError({"group": "Group not found."})

        if not group.members.filter(id=request.user.id).exists():
            raise serializers.ValidationError(
                {"group": "You are not a member of this group."}
            )

        paid_to_id = attrs.get('paid_to_id')
        if not group.members.filter(id=paid_to_id).exists():
            raise serializers.ValidationError(
                {"paid_to_id": "Recipient must be a group member."}
            )

        if paid_to_id == request.user.id:
            raise serializers.ValidationError(
                {"paid_to_id": "You cannot pay yourself."}
            )

        return attrs

    def create(self, validated_data):
        from users.models import User
        paid_to_id = validated_data.pop('paid_to_id')
        paid_to_user = User.objects.get(id=paid_to_id)
        return Repayment.objects.create(
            paid_by=self.context['request'].user,
            paid_to=paid_to_user,
            **validated_data
        )