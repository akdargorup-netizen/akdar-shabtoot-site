import { CONTACT_CATEGORY_DEFS } from './contacts-seed-data.js';
import { getContacts }           from './db.js';
export { CONTACT_CATEGORY_DEFS };
const GROUP_DEFS = [
{
key:          'community',
label:        'خدمات القرية واللجان',
description:  'لجان المساجد، الصهريج، القرية، وجمعيات المناسبات',
icon:         'users',
categoryKeys: ['committees', 'mosque-committees', 'event-associations'],
},
{
key:          'education-media',
label:        'تعليم وثقافة وإعلام',
description:  'المدارس، الاستشارات التعليمية، الرياضة والإعلام',
icon:         'graduation-cap',
categoryKeys: ['education', 'sports-media'],
},
{
key:          'trade-crafts',
label:        'تجارة وحرف وصيانة',
description:  'المتاجر، البناء، الكهرباء، النقل والحرف اليدوية',
icon:         'wrench',
categoryKeys: ['shops', 'building', 'electrical-energy', 'transport', 'crafts', 'food'],
},
{
key:          'travel',
label:        'سفر ومواصلات',
description:  'باصات ووكالات السفر بين المدن',
icon:         'bus',
categoryKeys: ['travel'],
},
];
const EMERGENCY_KEY = 'emergency';
const EMERGENCY_DESCRIPTION = 'إسعاف ومراكز صحية — أول جهة تتصل بيها وقت الحاجة';
export async function getContactCategoriesWithContacts() {
const allContacts = await getContacts();
return CONTACT_CATEGORY_DEFS.map(def => ({
...def,
contacts: allContacts.filter(c => c.categoryKey === def.key),
}));
}
export async function getContactIndexItems() {
const categories = await getContactCategoriesWithContacts();
const byKey = Object.fromEntries(categories.map(c => [c.key, c]));
const items = [];
const emergency = byKey[EMERGENCY_KEY];
if (emergency) {
items.push({
key:         emergency.key,
label:       emergency.label,
description: EMERGENCY_DESCRIPTION,
icon:        emergency.icon,
contacts:    emergency.contacts,
categories:  [{ key: emergency.key, label: emergency.label, icon: emergency.icon, contacts: emergency.contacts }],
variant:     'emergency',
});
}
GROUP_DEFS.forEach(group => {
const cats = group.categoryKeys.map(k => byKey[k]).filter(Boolean);
items.push({
key:         group.key,
label:       group.label,
description: group.description,
icon:        group.icon,
contacts:    cats.flatMap(c => c.contacts),
categories:  cats.map(c => ({ key: c.key, label: c.label, icon: c.icon, contacts: c.contacts })),
variant:     'default',
});
});
return items;
}
