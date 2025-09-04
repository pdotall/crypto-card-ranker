// src/config.js
export const SHEET_PUBHTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTDMk6JfiCetkd9sZebCIcZPUJu5omoS6GA5fnXjEK6NkjUbL5Y6BprxSsaRhV4eQ7xTogWq495HErk/pubhtml?gid=0&single=true';

export const SAMPLE_CSV = `Card,Issuer,Network,Country,Rewards,Annual Fee,FX Fee,Stake Required,Limits,Link,DS,Score: Features,Score: Rewards,Score: Fees,Image
"Example Card A","Acme","Visa","US","1% cashback","$0","0%","None","$5,000/mo","https://example.com/a",179,133,46,19,https://dummyimage.com/64x44/1b2550/ffffff.png&text=A
"Example Card B","Acme","Mastercard","UK","2% on dining","$99","3%","$1000 stake","$10,000/mo","https://example.com/b",175,137,38,23,https://dummyimage.com/64x44/5a2b8a/ffffff.png&text=B`;

export const ALIASES = {
  card: ['Card','Card Name','Name','Product','Card_name'],
  issuer: ['Issuer','Bank','Provider','Company'],
  network: ['Network','Scheme','Brand'],
  country: ['Country','Region','Market'],
  rewards: ['Rewards','Cashback','Perks','Benefits'],
  annualFee: ['Annual Fee','Yearly Fee','Ann. Fee','Annual_fee'],
  fxFee: ['FX Fee','Foreign Fee','Intl Fee','FX'],
  stake: ['Stake Required','Stake','Stake Tier','Staking'],
  limits: ['Limits','Limit','Monthly Limit','Daily Limit'],
  link: ['Link','URL','Website']
};

// NEW: horizontal row design helpers
// If your sheet uses different names, either rename columns or add them here:
// Add/replace this array
export const IMAGE_FIELDS = [
  'Image', 'Image link', 'Image Link', 'Image URL', 'Image_URL', 'ImageURL',
  'Logo', 'Card Image', 'Card_Img', 'Thumbnail', 'Picture'
];
export const DS_FIELDS    = ['DS','Daedalus Score','Card Score','Score'];
export const RANK_FIELDS  = ['Rank','Card Rank','Category Rank'];

// Breakdown segments (dynamic). Leave SEGMENT_KEYS empty to auto-detect any
// numeric columns whose headers start with "Score", or contain "Score:".
// Example auto-detected: "Score: Features", "Features Score", etc.
export const SEGMENT_KEYS = [];            // e.g., ['Score: Features','Score: Rewards','Score: Fees']
export const SEGMENT_DETECT = /(^score[ _:-]| score$|^breakdown[ _:-]|^segment[ _:-]|^category[ _:-])/i;
export const SEGMENT_MAX = 6;              // cap segments so the bar stays readable

// Replace your BAR_COLORS line with this:
export const BAR_COLORS = ['#f5f5f5','#d9d9d9','#bfbfbf','#a6a6a6','#8c8c8c','#737373'];

// UI toggles
export const SHOW_DETAILS = true;          // adds a collapsible “Details” under each row
