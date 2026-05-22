import type { Campaign } from '../engine/campaign/campaignTypes';

export const CAMPAIGN_CREATOR_DRAFT_KEY = 'fatewarden_campaign_creator_draft';

export function saveCampaignCreatorDraft(campaign: Campaign) {
  window.localStorage.setItem(CAMPAIGN_CREATOR_DRAFT_KEY, JSON.stringify(campaign));
}
