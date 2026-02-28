from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from .models import Group, GroupMembership
from .serializers import GroupSerializer, AddMemberSerializer
from .permissions import IsGroupMember, IsGroupAdmin


class GroupViewSet(ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only see groups they belong to
        return Group.objects.filter(members=self.request.user).prefetch_related(
            'groupmembership_set__user'
        )

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsGroupAdmin()]
        if self.action in ['retrieve', 'balances', 'settlements']:
            return [permissions.IsAuthenticated(), IsGroupMember()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_member(self, request, pk=None):
        group = self.get_object()
        # Only admins can add members
        if not GroupMembership.objects.filter(
            user=request.user, group=group, is_admin=True
        ).exists():
            return Response(
                {"detail": "Only admins can add members."},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_to_add = serializer.user_instance
        if GroupMembership.objects.filter(user=user_to_add, group=group).exists():
            return Response(
                {"detail": "User is already a member."},
                status=status.HTTP_400_BAD_REQUEST
            )
        GroupMembership.objects.create(user=user_to_add, group=group)
        return Response({"detail": f"{user_to_add.email} added successfully."})

    @action(detail=True, methods=['post'], url_path='remove-member')
    def remove_member(self, request, pk=None):
        group = self.get_object()
        if not GroupMembership.objects.filter(
            user=request.user, group=group, is_admin=True
        ).exists():
            return Response(
                {"detail": "Only admins can remove members."},
                status=status.HTTP_403_FORBIDDEN
            )
        email = request.data.get('email')
        try:
            from users.models import User
            user_to_remove = User.objects.get(email=email)
            membership = GroupMembership.objects.get(user=user_to_remove, group=group)
            if user_to_remove == group.created_by:
                return Response(
                    {"detail": "Cannot remove the group creator."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            membership.delete()
            return Response({"detail": "Member removed."})
        except Exception:
            return Response(
                {"detail": "Member not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def balances(self, request, pk=None):
        """Returns each member's net balance in the group."""
        group = self.get_object()
        from expenses.services import calculate_group_balances
        balances = calculate_group_balances(group)
        return Response(balances)

    @action(detail=True, methods=['get'])
    def settlements(self, request, pk=None):
        """Returns the minimum transactions needed to settle all debts."""
        group = self.get_object()
        from expenses.services import calculate_settlements
        settlements = calculate_settlements(group)
        return Response(settlements)