/**
 * Database types matching supabase/migrations/20260922120000_initial_schema.sql.
 * Kept in sync manually with migrations (no Supabase CLI in this project).
 */

export type MembershipRole = 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type ProtectedActionStatus = 'pending' | 'approved' | 'rejected';
export type McpAuditResultStatus = 'success' | 'error' | 'denied' | 'pending';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          user_id: string;
          organization_id: string;
          role: MembershipRole;
          created_at: string;
        };
        Insert: {
          user_id: string;
          organization_id: string;
          role?: MembershipRole;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          organization_id?: string;
          role?: MembershipRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: ProjectStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          assignee_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          assignee_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          assignee_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      mcp_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          client_id: string | null;
          tool_name: string;
          action_type: string;
          input_metadata: Json;
          result_status: McpAuditResultStatus;
          execution_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          client_id?: string | null;
          tool_name: string;
          action_type: string;
          input_metadata?: Json;
          result_status: McpAuditResultStatus;
          execution_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          client_id?: string | null;
          tool_name?: string;
          action_type?: string;
          input_metadata?: Json;
          result_status?: McpAuditResultStatus;
          execution_time_ms?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mcp_audit_events_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      protected_actions: {
        Row: {
          id: string;
          organization_id: string;
          requested_by: string;
          tool_name: string;
          payload: Json;
          status: ProtectedActionStatus;
          approved_by: string | null;
          requested_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          requested_by: string;
          tool_name: string;
          payload?: Json;
          status?: ProtectedActionStatus;
          approved_by?: string | null;
          requested_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          requested_by?: string;
          tool_name?: string;
          payload?: Json;
          status?: ProtectedActionStatus;
          approved_by?: string | null;
          requested_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'protected_actions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      is_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      get_org_role: {
        Args: { p_organization_id: string };
        Returns: MembershipRole;
      };
      is_org_admin: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      is_org_writer: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      membership_role: MembershipRole;
      project_status: ProjectStatus;
      task_status: TaskStatus;
      protected_action_status: ProtectedActionStatus;
      mcp_audit_result_status: McpAuditResultStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PublicTables = Database['public']['Tables'];

export type Organization = PublicTables['organizations']['Row'];
export type Membership = PublicTables['memberships']['Row'];
export type Project = PublicTables['projects']['Row'];
export type Task = PublicTables['tasks']['Row'];
export type McpAuditEvent = PublicTables['mcp_audit_events']['Row'];
export type ProtectedAction = PublicTables['protected_actions']['Row'];

export type OrganizationInsert = PublicTables['organizations']['Insert'];
export type MembershipInsert = PublicTables['memberships']['Insert'];
export type ProjectInsert = PublicTables['projects']['Insert'];
export type TaskInsert = PublicTables['tasks']['Insert'];
export type McpAuditEventInsert = PublicTables['mcp_audit_events']['Insert'];
export type ProtectedActionInsert = PublicTables['protected_actions']['Insert'];
