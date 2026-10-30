export const NEWS_CATEGORIES = [
{ key: 'community', label: 'المجتمع' },
{ key: 'events',     label: 'فعاليات' },
{ key: 'projects',   label: 'مشاريع وتنمية' },
];
export const NOTIFICATION_TYPES = [
{ key: 'news',       label: 'خبر',        icon: 'newspaper',       page: 'news' },
{ key: 'event',      label: 'الفعاليات',   icon: 'calendar-heart',  page: 'events' },
{ key: 'congrats',   label: 'تبريك',       icon: 'party-popper',    page: 'community-occasions' },
{ key: 'condolence', label: 'تعزية',       icon: 'flower-2',        page: 'community-occasions' },
{ key: 'community',  label: 'مجتمع',       icon: 'megaphone',       page: 'community-occasions' },
{ key: 'project',    label: 'مشروع',       icon: 'trending-up',     page: 'development-projects' },
{ key: 'idea',       label: 'مصنع الأفكار', icon: 'lightbulb',      page: 'idea-box' },
{ key: 'worship',    label: 'العبادة',     icon: 'moon-star',       page: 'worship' },
{ key: 'nubian',     label: 'آنداندي',     icon: 'languages',       page: 'nubian-dictionary' },
{ key: 'system',     label: 'رسالة عامة', icon: 'bell',            page: '' },
{ key: 'like',    label: 'إعجاب', icon: 'heart',          page: '', personal: true },
{ key: 'comment', label: 'تعليق', icon: 'message-circle', page: '', personal: true },
{ key: 'reply',   label: 'رد',    icon: 'reply',          page: '', personal: true },
{ key: 'endorse', label: 'تأييد', icon: 'thumbs-up',      page: '', personal: true },
];
export const NOTIFICATION_TYPE_TO_SETTING = {
news:       'notif-news',
event:      'notif-events',
solidarity: 'notif-community-life',
congrats:   'notif-community-life',
condolence: 'notif-community-life',
community:  'notif-community',
project:    'notif-projects',
idea:       'notif-projects',
worship:    'notif-worship',
nubian:     'notif-community',
like:       'notif-interactions',
comment:    'notif-interactions',
reply:      'notif-interactions',
endorse:    'notif-interactions',
};
export function buildInteractionMessage(kind, actorName, targetTitle) {
const name = actorName || 'عضو من البلد';
switch (kind) {
case 'like_occasion':
return { type: 'like', title: 'إعجاب بمناسبتك', body: `أعجب ${name} بمناسبتك «${targetTitle}»` };
case 'comment_occasion':
return { type: 'comment', title: 'تعليق على مناسبتك', body: `علّق ${name} على مناسبتك «${targetTitle}»` };
case 'comment_idea':
return { type: 'comment', title: 'تعليق على فكرتك', body: `علّق ${name} على فكرتك «${targetTitle}»` };
case 'like_comment':
return { type: 'like', title: 'إعجاب بتعليقك', body: `أعجب ${name} بتعليقك` };
case 'endorse_idea':
return { type: 'endorse', title: 'تأييد لفكرتك', body: `أيّد ${name} فكرتك «${targetTitle}»` };
default:
return null;
}
}
