import { _WRITE_TIMEOUT_MS, _sbRead, _sbWrite, _run, _fail, _rows, _reconcile } from './sb-helpers.js';
import { exportBackup, backupSummary, backupDiff, importBackup } from './supabase-adapter.js';
import { cachePut, cacheDelPrefix } from '../read-cache.js';
import { prepareQuery, scoreText } from '../../shared/arabic-search.js';
import { formatRelativeTime } from '../../shared/relative-time.js';
import { RETENTION_DAYS, RETENTION_LABELS, isArchived } from '../retention.js';
import { DEFAULT_CONTACT_RECIPIENTS } from '../contact-recipients-data.js';
import { getNews, getEvents } from './supabase-content-adapter.js';
import { getHistoryArticles, getAssociationJourneyArticles, getProjects, getContacts } from './supabase-library-adapter.js';
import { getIdeas } from './supabase-data-adapter.js';
const STATIC_INDEX = [
{ type: 'تاريخ',  title: 'التاريخ',                page: 'history'          },
{ type: 'تاريخ',  title: 'مقالاتنا',                page: 'history-articles' },
{ type: 'تاريخ',  title: 'البدايات',                page: 'history-articles' },
{ type: 'تاريخ',  title: 'الرِجالات',                page: 'history-articles' },
{ type: 'تاريخ',  title: 'العادات والتقاليد',        page: 'history-articles' },
{ type: 'تاريخ',  title: 'الأحداث',                  page: 'history-articles' },
{ type: 'تاريخ',  title: 'إنجازات',                  page: 'history-articles' },
{ type: 'خدمة',   title: 'متابعة المشاريع',          page: 'development-projects' },
{ type: 'خدمة',   title: 'دليل البلد',              page: 'contact-directory'   },
{ type: 'خدمة',   title: 'خدمات الطلاب',            page: 'student-services'    },
{ type: 'عبادة',  title: 'محاضرات دينية',           page: 'worship-lectures' },
{ type: 'ذاكرة',  title: 'هنا صورنا',                page: 'memory-gallery' },
{ type: 'مجتمع',  title: 'المناسبات',      page: 'community-occasions'    },
{ type: 'مجتمع',  title: 'الفعاليات',    page: 'events'                 },
{ type: 'أفكار',  title: 'مصنع الأفكار',       page: 'idea-box' },
{ type: 'رابطة',  title: 'عن الرابطة',               page: 'association-about'         },
{ type: 'رابطة',  title: 'مسيرة الرابطة',             page: 'association-journey'       },
{ type: 'رابطة',  title: 'الدستور',                   page: 'association-regulations'   },
{ type: 'رابطة',  title: 'اللوائح الداخلية',           page: 'association-regulations'   },
{ type: 'نوبي',   title: 'آنداندي',                 page: 'nubian-dictionary' },
{ type: 'قاموس',  title: 'التحية والوداع',           page: 'nubian-greetings'       },
{ type: 'قاموس',  title: 'الضمائر وضمائر الملكية',   page: 'nubian-pronouns'        },
{ type: 'قاموس',  title: 'أفراد العائلة',            page: 'nubian-family'          },
{ type: 'قاموس',  title: 'أيام الأسبوع والزمن',      page: 'nubian-time'            },
{ type: 'قاموس',  title: 'الأعداد',                  page: 'nubian-numbers'         },
{ type: 'قاموس',  title: 'أجزاء الجسم',              page: 'nubian-body'            },
{ type: 'قاموس',  title: 'الأفعال',                  page: 'nubian-verbs'           },
{ type: 'قاموس',  title: 'الصفات',                   page: 'nubian-adjectives'      },
{ type: 'قاموس',  title: 'المنزل ومحتوياته',         page: 'nubian-home'            },
{ type: 'قاموس',  title: 'الزراعة والأشجار والمحاصيل', page: 'nubian-farming'       },
{ type: 'قاموس',  title: 'الحيوانات',                page: 'nubian-animals'         },
{ type: 'قاموس',  title: 'ظروف المكان',              page: 'nubian-place'           },
{ type: 'قاموس',  title: 'الاتجاهات',                page: 'nubian-directions'      },
{ type: 'قاموس',  title: 'أسماء الإشارة',            page: 'nubian-demonstratives'  },
{ type: 'قاموس',  title: 'الألوان',                  page: 'nubian-colors'          },
{ type: 'قاموس',  title: 'الفلك والطقس',             page: 'nubian-weather'         },
{ type: 'قاموس',  title: 'الأمراض',                  page: 'nubian-diseases'        },
{ type: 'إعدادات', title: 'عن التطبيق',              page: 'settings-about' },
];
const _matches = (target, pq) => scoreText(target, pq) > 0;
export async function search(searchQuery) {
if (!searchQuery || !searchQuery.trim()) return [];
const q = prepareQuery(searchQuery);
if (q.isEmpty) return [];
const safe = (p) => p.catch(() => []);
const [newsAll, historyAll, journeyAll, projectsAll, ideasAll, contactsAll, eventsAll] = await Promise.all([
safe(getNews({ includeArchived: true, limit: 100000 })), safe(getHistoryArticles()), safe(getAssociationJourneyArticles()),
safe(getProjects()), safe(getIdeas()), safe(getContacts()), safe(getEvents()),
]);
const newsHits = newsAll
.filter(n => _matches(n.title, q) || _matches(n.category, q))
.map(n => ({ type: 'خبر', title: n.title, page: 'news', id: n.id, articleType: 'news', time: formatRelativeTime(n.publishedAt) }));
const historyHits = historyAll
.filter(a => _matches(a.title, q))
.map(a => ({ type: 'تاريخ', title: a.title, page: `history-${a.section === 'symbols' ? 'figures' : a.section === 'turningPoints' ? 'events' : a.section}`, id: a.id, articleType: 'history' }));
const journeyHits = journeyAll
.filter(a => _matches(a.title, q))
.map(a => ({ type: 'رابطة', title: a.title, page: 'association-journey', id: a.id, articleType: 'association' }));
const projectHits = projectsAll
.filter(p => _matches(p.title, q))
.map(p => ({ type: 'مشروع', title: p.title, page: 'development-projects' }));
const ideaHits = ideasAll
.filter(i => _matches(i.title, q))
.map(i => ({ type: 'فكرة', title: i.title, page: 'idea-box' }));
const contactHits = contactsAll
.filter(c => _matches(`${c.name} ${c.role || ''}`, q))
.map(c => ({ type: 'دليل الاتصال', title: c.name, page: 'contact-directory' }));
const eventHits = eventsAll
.filter(e => e.title && _matches(e.title, q))
.map(e => ({ type: 'مناسبة', title: e.title, page: 'events' }));
const staticHits = STATIC_INDEX.filter(item => _matches(item.title, q) || _matches(item.type, q));
const all = [...newsHits, ...historyHits, ...journeyHits, ...projectHits, ...ideaHits, ...contactHits, ...eventHits, ...staticHits];
return all
.map((hit, i) => ({ hit, i, s: scoreText(hit.title, q) }))
.sort((a, b) => b.s - a.s || a.i - b.i)
.map(x => x.hit);
}
const RECIPIENTS_KEY = 'contactRecipients';
export async function getContactRecipients() {
const data = await _rows('settings:recipients', async () => {
const sb = await _sbRead();
const { data: row, error } = await _run(sb.from('settings').select('data').eq('key', RECIPIENTS_KEY).maybeSingle());
if (error) throw error;
return row?.data ?? null;
}, { collection: 'recipients', ttlMs: 3600000 });
return { ...DEFAULT_CONTACT_RECIPIENTS, ...(data || {}) };
}
export async function setContactRecipients({ contributionWhatsapp, reportEmail }) {
const payload = {
contributionWhatsapp: String(contributionWhatsapp || '').trim(),
reportEmail:          String(reportEmail || '').trim(),
};
const sb = await _sbWrite();
const { error } = await _run(sb.from('settings').upsert({ key: RECIPIENTS_KEY, data: payload }, { onConflict: 'key' }), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
cachePut('settings:recipients', payload);
return { ...DEFAULT_CONTACT_RECIPIENTS, ...payload };
}
const WORD_CATS_KEY = 'nubianWordCategories';
const WORD_CATS_CACHE = 'settings:nubianWordCats';
const _emptyWordCats = () => ({ overrides: {}, custom: [] });
const _seedCats = async () => (await import('../nubian-language-data.js')).NUBIAN_LANGUAGE_CATEGORIES;
function _mergeWordCats(data, NUBIAN_LANGUAGE_CATEGORIES) {
const overrides = (data && typeof data.overrides === 'object' && data.overrides) || {};
const custom = Array.isArray(data?.custom) ? data.custom : [];
const base = NUBIAN_LANGUAGE_CATEGORIES.map((c) => {
const o = overrides[c.key] || {};
return { ...c, title: o.title || c.title, icon: o.icon || c.icon || 'folder' };
});
const extra = custom
.filter((c) => c && c.key && c.title)
.map((c) => ({ key: String(c.key), title: String(c.title), subtitle: '', icon: c.icon || 'folder', words: [], custom: true }));
return [...base, ...extra];
}
async function _readWordCatsData({ fresh = false } = {}) {
const data = await _rows(WORD_CATS_CACHE, async () => {
const sb = await _sbRead();
const { data: row, error } = await _run(sb.from('settings').select('data').eq('key', WORD_CATS_KEY).maybeSingle());
if (error) throw error;
return row?.data ?? _emptyWordCats();
}, { collection: 'nubianWordCats', ttlMs: 600000, fresh });
return { overrides: { ...(data?.overrides || {}) }, custom: Array.isArray(data?.custom) ? [...data.custom] : [] };
}
async function _writeWordCatsData(data) {
const sb = await _sbWrite();
const { error } = await _run(sb.from('settings').upsert({ key: WORD_CATS_KEY, data }, { onConflict: 'key' }), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
await cachePut(WORD_CATS_CACHE, data);
}
export async function getNubianWordCategories() {
const seed = await _seedCats();
try { return _mergeWordCats(await _readWordCatsData(), seed); } catch { return _mergeWordCats(null, seed); }
}
export async function saveNubianWordCategory({ key, title, icon } = {}) {
const t = String(title || '').trim();
if (!t) throw new Error('اكتب اسم التصنيف');
const ic = String(icon || '').trim() || 'folder';
const NUBIAN_LANGUAGE_CATEGORIES = await _seedCats();
const data = await _readWordCatsData({ fresh: true });
let savedKey = key ? String(key) : '';
if (savedKey && NUBIAN_LANGUAGE_CATEGORIES.some((c) => c.key === savedKey)) {
data.overrides[savedKey] = { title: t, icon: ic };
} else if (savedKey) {
const i = data.custom.findIndex((c) => c.key === savedKey);
if (i < 0) throw new Error('التصنيف دا ما عاد موجود');
data.custom[i] = { ...data.custom[i], title: t, icon: ic };
} else {
savedKey = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
data.custom.push({ key: savedKey, title: t, icon: ic });
}
await _writeWordCatsData(data);
return _mergeWordCats(data, NUBIAN_LANGUAGE_CATEGORIES).find((c) => c.key === savedKey) || null;
}
export async function deleteNubianWordCategory(key) {
const k = String(key || '');
const data = await _readWordCatsData({ fresh: true });
if (!data.custom.some((c) => c.key === k)) throw new Error('التصنيفات الأساسية ما بتتمسح — تقدر تعدّل اسمها وأيقونتها بس');
const sb = await _sbWrite();
const { data: removed, error } = await _run(sb.from('nubian_words').delete().eq('category', k).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
data.custom = data.custom.filter((c) => c.key !== k);
await _writeWordCatsData(data);
if ((removed || []).length) await cacheDelPrefix('nubian_words:');
return { removedWordsCount: (removed || []).length };
}
const _ADMIN_READ_MS = 30000;
const _ARCHIVE_SOURCES = {
news:          { table: 'news',           dateCol: 'published_at', manual: true  },
notifications: { table: 'notifications',  dateCol: 'created_at',   manual: true  },
ideas:         { table: 'ideas',          dateCol: 'created_at',   manual: true  },
comments:      { table: 'idea_comments',  dateCol: 'created_at',   manual: false },
occasions:     { table: 'occasions',      dateCol: 'created_at',   manual: true  },
inbox:         { table: 'inbox_messages', dateCol: 'created_at',   manual: false },
};
async function _lightRows(type) {
const { table, dateCol, manual } = _ARCHIVE_SOURCES[type];
const sb = await _sbWrite();
const { data, error } = await _run(
sb.from(table).select(manual ? `id, ${dateCol}, archive_state` : `id, ${dateCol}`).limit(20000), _ADMIN_READ_MS);
if (error) throw error;
return (data || []).map(r => ({ id: r.id, date: r[dateCol], archiveState: r.archive_state || undefined }));
}
function _isArchivedRow(row, type) {
if (row.archiveState === 'archived') return true;
if (row.archiveState === 'restored') return false;
return isArchived(row.date, type);
}
export async function getArchiveStats() {
const types = ['news', 'notifications', 'ideas', 'comments', 'occasions', 'inbox'];
const lists = await Promise.all(types.map(_lightRows));
return types.map((key, i) => ({
key, label: RETENTION_LABELS[key], retentionDays: RETENTION_DAYS[key],
total: lists[i].length, archived: lists[i].filter(r => _isArchivedRow(r, key)).length,
}));
}
async function _deleteIds(table, ids) {
const sb = await _sbWrite();
let removed = 0;
for (let i = 0; i < ids.length; i += 100) {
const { data, error } = await _run(sb.from(table).delete().in('id', ids.slice(i, i + 100)).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
removed += data?.length || 0;
}
return removed;
}
export async function purgeArchivedContent(type) {
const result = {};
const order = ['news', 'notifications', 'inbox', 'occasions', 'ideas', 'comments'];
for (const key of order) {
if (type && type !== key) continue;
const rows = await _lightRows(key);
const ids = rows.filter(r => _isArchivedRow(r, key)).map(r => r.id);
result[key] = ids.length ? await _deleteIds(_ARCHIVE_SOURCES[key].table, ids) : 0;
}
_reconcile('news:', 'notifs:', 'ideas:', 'occasions:', 'recent:', 'idea_comments:', 'occasion_comments:');
try { await cacheDelPrefix('news:rows'); } catch {   }
return result;
}
export async function exportAllData()       { return exportBackup(); }
export async function getBackupSummary(snap) { return backupSummary(snap); }
export async function previewBackupImport(snap) { return backupDiff(snap); }
export async function importAllData(snap, opts) { return importBackup(snap, opts); }
