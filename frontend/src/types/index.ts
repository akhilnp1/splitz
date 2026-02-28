export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

export interface GroupMember {
  user: User;
  joined_at: string;
  is_admin: boolean;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  created_by: User;
  members: GroupMember[];
  member_count: number;
  created_at: string;
}

export interface ExpenseSplit {
  id: number;
  user: User;
  amount_owed: string;
  is_settled: boolean;
}

export interface Expense {
  id: number;
  group: number;
  description: string;
  amount: string;
  paid_by: User;
  split_type: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
  splits: ExpenseSplit[];
  created_by: User;
  notes: string;
  created_at: string;
}

export interface Settlement {
  from_user: User;
  to_user: User;
  amount: string;
}

export interface Balance {
  user_id: number;
  username: string;
  email: string;
  balance: string;
}

export interface Repayment {
  id: number;
  group: number;
  paid_by: User;
  paid_to: User;
  amount: string;
  note: string;
  created_at: string;
}