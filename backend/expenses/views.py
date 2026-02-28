from rest_framework import generics, permissions, status
from rest_framework.response import Response
from groups.models import Group
from groups.permissions import IsGroupMember
from .models import Expense, Repayment
from .serializers import ExpenseSerializer, RepaymentSerializer


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs['group_id']
        # Ensure user is a member of the group
        return Expense.objects.filter(
            group_id=group_id,
            group__members=self.request.user
        ).select_related('paid_by', 'created_by').prefetch_related('splits__user')

    def perform_create(self, serializer):
        group_id = self.kwargs['group_id']
        try:
            group = Group.objects.get(id=group_id, members=self.request.user)
        except Group.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not a member of this group.")
        serializer.save(group=group)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(
            group__members=self.request.user
        ).select_related('paid_by', 'created_by').prefetch_related('splits__user')


class RepaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = RepaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs['group_id']
        return Repayment.objects.filter(
            group_id=group_id,
            group__members=self.request.user
        ).select_related('paid_by', 'paid_to')

    def perform_create(self, serializer):
        group_id = self.kwargs['group_id']
        try:
            group = Group.objects.get(id=group_id, members=self.request.user)
        except Group.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not a member of this group.")
        serializer.save(group=group)