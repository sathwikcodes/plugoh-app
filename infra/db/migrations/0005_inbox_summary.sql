-- Inbox summary: compute each campaign's latest message + unread count for a user
-- in a single aggregate query, replacing the previous "load every message across
-- every campaign and group/sort in app memory" approach (O(all messages) per open).

-- Supporting indexes for the latest-message-per-campaign and unread lookups.
create index if not exists campaign_messages_campaign_created_idx
  on public.campaign_messages (campaign_id, created_at desc);
create index if not exists campaigns_business_idx
  on public.campaigns (business_id);
create index if not exists campaigns_influencer_idx
  on public.campaigns (influencer_id);

-- Returns one row per campaign the user participates in (as the given role),
-- ordered newest-activity-first: { campaign, latest_message, unread_count }.
create or replace function public.inbox_summary(p_user_id uuid, p_role text)
returns table (campaign jsonb, latest_message jsonb, unread_count bigint)
language sql
stable
security definer
as $$
  with my_campaigns as (
    select c.*
    from public.campaigns c
    where (p_role = 'business' and c.business_id = p_user_id)
       or (p_role = 'influencer' and c.influencer_id = p_user_id)
  ),
  latest as (
    select distinct on (m.campaign_id) m.*
    from public.campaign_messages m
    join my_campaigns mc on mc.id = m.campaign_id
    order by m.campaign_id, m.created_at desc
  ),
  unread as (
    select m.campaign_id, count(*)::bigint as cnt
    from public.campaign_messages m
    join my_campaigns mc on mc.id = m.campaign_id
    where m.sender_id <> p_user_id
      and not exists (
        select 1
        from public.campaign_message_reads r
        where r.message_id = m.id and r.user_id = p_user_id
      )
    group by m.campaign_id
  )
  select
    to_jsonb(mc)                                              as campaign,
    case when l.id is null then null else to_jsonb(l) end     as latest_message,
    coalesce(u.cnt, 0)                                        as unread_count
  from my_campaigns mc
  left join latest l on l.campaign_id = mc.id
  left join unread u on u.campaign_id = mc.id
  order by coalesce(l.created_at, mc.created_at) desc;
$$;

grant execute on function public.inbox_summary(uuid, text) to authenticated, anon, service_role;
