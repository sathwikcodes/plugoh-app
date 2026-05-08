-- Tighten influencer transition guards to preserve one-winner semantics under contention.

create or replace function public.accept_campaign(p_campaign_id uuid, p_actor uuid)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.influencer_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Influencer on campaign required';
  end if;
  if v_campaign.status not in ('requested', 'pre_authorized') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->accepted', v_campaign.status);
  end if;

  if v_campaign.status = 'pre_authorized' then
    update public.campaigns
      set status = 'in_escrow',
          payment_status = 'paid',
          accepted_at = now(),
          payment_captured_at = now(),
          updated_at = now()
    where id = p_campaign_id
    returning * into v_campaign;

    insert into public.escrow_transactions (
      campaign_id, type, amount_paise, platform_fee_paise,
      razorpay_order_id, razorpay_payment_id, status, created_at
    )
    values (
      p_campaign_id,
      'escrow_lock',
      round(coalesce(v_campaign.total_charged_amount, 0) * 100),
      round(coalesce(v_campaign.platform_fee_amount, 0) * 100),
      v_campaign.razorpay_order_id,
      v_campaign.razorpay_payment_id,
      'success',
      now()
    )
    on conflict do nothing;
  else
    update public.campaigns
      set status = 'payment_pending',
          expires_at = now() + interval '24 hours',
          accepted_at = now(),
          updated_at = now()
    where id = p_campaign_id
    returning * into v_campaign;
  end if;

  return v_campaign;
end;
$$;

create or replace function public.decline_campaign(p_campaign_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
  v_should_refund boolean := false;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.influencer_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Influencer on campaign required';
  end if;
  if v_campaign.status not in ('requested', 'pre_authorized') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->declined', v_campaign.status);
  end if;

  v_should_refund := (
    v_campaign.status = 'pre_authorized'
    and v_campaign.payment_method = 'upi'
    and v_campaign.razorpay_payment_id is not null
  );

  update public.campaigns
    set status = 'declined', updated_at = now()
  where id = p_campaign_id
  returning * into v_campaign;

  return jsonb_build_object(
    'campaign', to_jsonb(v_campaign),
    'should_refund', v_should_refund
  );
end;
$$;
