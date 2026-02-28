from rest_framework import serializers
from .models import Group, GroupMembership
from users.serializers import UserSerializer


class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['user', 'joined_at', 'is_admin']


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMembershipSerializer(
        source='groupmembership_set', many=True, read_only=True
    )
    created_by = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'created_by',
            'members', 'member_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def create(self, validated_data):
        user = self.context['request'].user
        group = Group.objects.create(created_by=user, **validated_data)
        # Creator automatically becomes admin member
        GroupMembership.objects.create(user=user, group=group, is_admin=True)
        return group


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        from users.models import User
        try:
            self.user_instance = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email.")
        return value