// src/config.js
export const SHEET_PUBHTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTDMk6JfiCetkd9sZebCIcZPUJu5omoS6GA5fnXjEK6NkjUbL5Y6BprxSsaRhV4eQ7xTogWq495HErk/pubhtml?gid=0&single=true';

export const SAMPLE_CSV = `Card,Issuer,Network,Country,Rewards,Annual Fee,FX Fee,Stake Required,Limits,Link
"Example Card A","Acme","Visa","US","1% cashback","$0","0%","None","$5,000/mo","https://example.com/a"
"Example Card B","Acme","Mastercard","UK","2% on dining","$99","3%","$1000 stake","$10,000/mo","https://example.com/b"`;

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
