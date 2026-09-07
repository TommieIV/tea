import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Authentication is required.')
    const { workspaceId, email, displayName } = await request.json()
    if (!workspaceId || !email) throw new Error('A workspace and email are required.')

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: allowed, error: allowedError } = await caller.rpc('admin_can_manage_members', { target_workspace_id: workspaceId })
    if (allowedError || !allowed) throw new Error('You do not have permission to invite members to this workspace.')

    const admin = createClient(url, serviceRoleKey)
    const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email.trim(), { data: { display_name: displayName?.trim() || null } })
    if (invitationError || !invitation.user) throw invitationError ?? new Error('The invitation could not be created.')
    const { data: memberRole, error: roleError } = await admin.from('roles').select('id').eq('workspace_id', workspaceId).eq('name', 'Member').single()
    if (roleError || !memberRole) throw roleError ?? new Error('The workspace Member role is missing.')

    const { error: profileError } = await admin.from('profiles').upsert({ id: invitation.user.id, display_name: displayName?.trim() || null })
    if (profileError) throw profileError
    const { error: membershipError } = await admin.from('memberships').upsert({ user_id: invitation.user.id, workspace_id: workspaceId, role_id: memberRole.id, status: 'active' }, { onConflict: 'user_id,workspace_id' })
    if (membershipError) throw membershipError

    return Response.json({ ok: true }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invitation failed.' }, { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
