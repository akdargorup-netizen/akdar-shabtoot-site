import { formatRelativeTime as _formatRelativeTime } from '../shared/relative-time.js';
import * as supabaseDataAdapter from './adapters/supabase-data-adapter.js';
import * as supabaseContentAdapter from './adapters/supabase-content-adapter.js';
import * as supabaseLibraryAdapter from './adapters/supabase-library-adapter.js';
import * as supabaseMiscAdapter from './adapters/supabase-misc-adapter.js';
const adapter = { ...supabaseContentAdapter, ...supabaseLibraryAdapter, ...supabaseMiscAdapter, ...supabaseDataAdapter };
import * as imageAdapter from './adapters/supabase-adapter.js';
import { enforceMaxLength, enforceCooldown, enforceReadable } from '../shared/submission-guard.js';
import { OCCASION_COMMENT_MAX_LENGTH } from './occasion-categories.js';
export async function uploadImage(blob, options = {}) {
return imageAdapter.uploadImage(blob, options);
}
export async function getImageStorageUsage() {
return imageAdapter.getImageStorageUsage();
}
export async function getUsageStats() {
return imageAdapter.fetchUsageStats();
}
async function _deleteWithImageCleanup(getItem, doDelete, id) {
let image = '';
try { image = (await getItem(id))?.image || ''; } catch {   }
const result = await doDelete(id);
if (image) imageAdapter.deleteStoredImages([image]).catch(() => {});
return result;
}
export async function getNews(options = {}) {
return adapter.getNews(options);
}
export async function getLatestNewsId() {
return adapter.getLatestNewsId();
}
export async function getRecentContentIds(section) {
return adapter.getRecentContentIds(section);
}
export async function getNewsItem(id) {
return adapter.getNewsItem(id);
}
export async function getBreakingNews() {
return adapter.getBreakingNews();
}
export async function addNews(newsItem) {
return adapter.addNews(newsItem);
}
export async function updateNews(id, updates) {
return adapter.updateNews(id, updates);
}
export async function deleteNews(id) {
return _deleteWithImageCleanup(getNewsItem, (x) => adapter.deleteNews(x), id);
}
export async function setNewsArchiveState(id, state) {
return adapter.setNewsArchiveState(id, state);
}
export async function getEvents() {
return adapter.getEvents();
}
export async function addEvent(eventItem) {
return adapter.addEvent(eventItem);
}
export async function updateEvent(id, updates) {
return adapter.updateEvent(id, updates);
}
export async function deleteEvent(id) {
return adapter.deleteEvent(id);
}
export async function getStudyVideos() {
return adapter.getStudyVideos();
}
export async function addStudyVideo(item) {
return adapter.addStudyVideo(item);
}
export async function updateStudyVideo(id, updates) {
return adapter.updateStudyVideo(id, updates);
}
export async function deleteStudyVideo(id) {
return adapter.deleteStudyVideo(id);
}
export async function getStudyTips() {
return adapter.getStudyTips();
}
export async function addStudyTip(item) {
return adapter.addStudyTip(item);
}
export async function updateStudyTip(id, updates) {
return adapter.updateStudyTip(id, updates);
}
export async function deleteStudyTip(id) {
return adapter.deleteStudyTip(id);
}
export async function getWorshipLectures() {
return adapter.getWorshipLectures();
}
export async function addWorshipLecture(item) {
return adapter.addWorshipLecture(item);
}
export async function updateWorshipLecture(id, updates) {
return adapter.updateWorshipLecture(id, updates);
}
export async function deleteWorshipLecture(id) {
return adapter.deleteWorshipLecture(id);
}
export async function getHistoryArticles(section, options) {
return adapter.getHistoryArticles(section, options);
}
export async function getHistoryArticle(id) {
return adapter.getHistoryArticle(id);
}
export async function addHistoryArticle(articleItem) {
return adapter.addHistoryArticle(articleItem);
}
export async function updateHistoryArticle(id, updates) {
return adapter.updateHistoryArticle(id, updates);
}
export async function deleteHistoryArticle(id) {
return _deleteWithImageCleanup(getHistoryArticle, (x) => adapter.deleteHistoryArticle(x), id);
}
export async function getAssociationJourneyArticles(section, options) {
return adapter.getAssociationJourneyArticles(section, options);
}
export async function getAssociationJourneyArticle(id) {
return adapter.getAssociationJourneyArticle(id);
}
export async function addAssociationJourneyArticle(articleItem) {
return adapter.addAssociationJourneyArticle(articleItem);
}
export async function updateAssociationJourneyArticle(id, updates) {
return adapter.updateAssociationJourneyArticle(id, updates);
}
export async function deleteAssociationJourneyArticle(id) {
return _deleteWithImageCleanup(getAssociationJourneyArticle, (x) => adapter.deleteAssociationJourneyArticle(x), id);
}
export async function getProjects() {
return adapter.getProjects();
}
export async function getProject(id) {
return adapter.getProject(id);
}
export async function addProject(projectItem) {
return adapter.addProject(projectItem);
}
export async function updateProject(id, updates) {
return adapter.updateProject(id, updates);
}
export async function deleteProject(id) {
return _deleteWithImageCleanup(getProject, (x) => adapter.deleteProject(x), id);
}
export async function getNubianWords(category) {
return adapter.getNubianWords(category);
}
export async function addNubianWord(wordItem) {
return adapter.addNubianWord(wordItem);
}
export async function updateNubianWord(id, updates) {
return adapter.updateNubianWord(id, updates);
}
export async function deleteNubianWord(id) {
return adapter.deleteNubianWord(id);
}
export async function getNubianWordCategories() {
return adapter.getNubianWordCategories();
}
export async function saveNubianWordCategory(category) {
return adapter.saveNubianWordCategory(category);
}
export async function deleteNubianWordCategory(key) {
return adapter.deleteNubianWordCategory(key);
}
export async function getNubianPhraseCategories() {
return adapter.getNubianPhraseCategories();
}
export async function addNubianPhraseCategory(category) {
return adapter.addNubianPhraseCategory(category);
}
export async function updateNubianPhraseCategory(key, updates) {
return adapter.updateNubianPhraseCategory(key, updates);
}
export async function deleteNubianPhraseCategory(key) {
return adapter.deleteNubianPhraseCategory(key);
}
export async function getNubianPhrases(category) {
return adapter.getNubianPhrases(category);
}
export async function addNubianPhrase(phraseItem) {
return adapter.addNubianPhrase(phraseItem);
}
export async function updateNubianPhrase(id, updates) {
return adapter.updateNubianPhrase(id, updates);
}
export async function deleteNubianPhrase(id) {
return adapter.deleteNubianPhrase(id);
}
export async function getNubianWordStats() { return adapter.getNubianWordStats(); }
export async function getNubianPhraseStats() { return adapter.getNubianPhraseStats(); }
export async function queryNubianWords(params) { return adapter.queryNubianWords(params); }
export async function queryNubianPhrases(params) { return adapter.queryNubianPhrases(params); }
export async function getGalleryItems(category) {
return adapter.getGalleryItems(category);
}
export async function getGalleryItem(id) {
return adapter.getGalleryItem(id);
}
export async function addGalleryItem(galleryItem) {
return adapter.addGalleryItem(galleryItem);
}
export async function updateGalleryItem(id, updates) {
return adapter.updateGalleryItem(id, updates);
}
export async function deleteGalleryItem(id) {
return _deleteWithImageCleanup(getGalleryItem, (x) => adapter.deleteGalleryItem(x), id);
}
export async function getContacts(categoryKey) {
return adapter.getContacts(categoryKey);
}
export async function getContact(id) {
return adapter.getContact(id);
}
export async function addContact(contactItem) {
return adapter.addContact(contactItem);
}
export async function updateContact(id, updates) {
return adapter.updateContact(id, updates);
}
export async function deleteContact(id) {
return adapter.deleteContact(id);
}
export async function search(query) {
return adapter.search(query);
}
export async function getNotifications(options) {
return adapter.getNotifications(options);
}
export async function setNotificationArchiveState(id, state) {
return adapter.setNotificationArchiveState(id, state);
}
export async function markNotificationRead(id) {
return adapter.markNotificationRead(id);
}
export async function saveNotification(notification) {
return adapter.saveNotification(notification);
}
export async function getUnreadNotificationsCount(options) {
return adapter.getUnreadNotificationsCount(options);
}
export async function addNotification(notification) {
return adapter.addNotification(notification);
}
export async function updateNotification(id, updates) {
return adapter.updateNotification(id, updates);
}
export async function deleteNotification(id) {
return adapter.deleteNotification(id);
}
export async function getIdeas(options = {}) {
return adapter.getIdeas(options);
}
export async function getLatestIdeaId() {
return adapter.getLatestIdeaId();
}
export async function getIdea(id) {
return adapter.getIdea(id);
}
export async function addIdea(ideaData) {
enforceMaxLength({
title:       { value: ideaData.title,       max: 80,  label: 'عنوان الفكرة' },
description: { value: ideaData.description, max: 400, label: 'وصف الفكرة' },
benefit:     { value: ideaData.benefit || '', max: 300, label: 'الفائدة' },
proposedEntity: { value: ideaData.proposedEntity || '', max: 120, label: 'الجهة المقترحة' },
});
enforceReadable({
title:       { value: ideaData.title,       label: 'عنوان الفكرة', minLetters: 4 },
description: { value: ideaData.description, label: 'وصف الفكرة',   minLetters: 15 },
benefit:     { value: ideaData.benefit || '', label: 'الفائدة',     minLetters: 3 },
});
enforceCooldown('add-idea');
const payload = ideaData.staffRole ? ideaData : { ...ideaData, moderation: 'pending' };
return adapter.addIdea(payload);
}
export async function voteIdea(ideaId, uid, value) {
if (value !== 'up' && value !== 'down') {
throw new Error('قيمة التصويت ما صالحة');
}
return adapter.voteIdea(ideaId, uid, value);
}
export async function getUserVote(ideaId, uid) {
const { getPendingReaction } = await import('../shared/reaction-outbox.js');
const pending = getPendingReaction('idea-vote', ideaId, uid);
if (pending) return pending;
return adapter.getUserVote(ideaId, uid);
}
export async function getIdeaComments(ideaId) {
return adapter.getIdeaComments(ideaId);
}
export async function addIdeaComment(ideaId, comment) {
enforceCooldown('add-idea-comment', 2500);
enforceMaxLength({
text: { value: comment.text, max: 500, label: 'التعليق' },
});
return adapter.addIdeaComment(ideaId, comment);
}
export async function toggleIdeaCommentLike(ideaId, commentId, uid) {
return adapter.toggleIdeaCommentLike(ideaId, commentId, uid);
}
export async function deleteIdea(id) {
return adapter.deleteIdea(id);
}
export async function updateIdea(id, patch) {
return adapter.updateIdea(id, patch);
}
export async function setIdeaArchiveState(id, state) {
return adapter.setIdeaArchiveState(id, state);
}
export async function getOccasions(options = {}) {
return adapter.getOccasions(options);
}
export async function getLatestOccasionId() {
return adapter.getLatestOccasionId();
}
export async function getOccasion(id) {
return adapter.getOccasion(id);
}
export async function addOccasion(occasionData) {
enforceMaxLength({
title:     { value: occasionData.title,       max: 100, label: 'عنوان المناسبة' },
ownerName: { value: occasionData.ownerName,    max: 60,  label: 'اسم صاحب المناسبة' },
text:      { value: occasionData.text || '',   max: 300, label: 'النص' },
});
enforceReadable({
title:     { value: occasionData.title,     label: 'عنوان المناسبة',  minLetters: 4 },
ownerName: { value: occasionData.ownerName, label: 'اسم صاحب المناسبة', minLetters: 3 },
text:      { value: occasionData.text || '', label: 'النص',           minLetters: 5 },
});
enforceCooldown('add-occasion');
const payload = occasionData.staffRole ? occasionData : { ...occasionData, moderation: 'pending' };
return adapter.addOccasion(payload);
}
export async function getOccasionComments(occasionId) {
return adapter.getOccasionComments(occasionId);
}
export async function getUserOccasionComment(occasionId, uid) {
return adapter.getUserOccasionComment(occasionId, uid);
}
export async function setOccasionLike(occasionId, uid, liked) {
return adapter.setOccasionLike(occasionId, uid, liked);
}
export async function getUserOccasionLike(occasionId, uid) {
const { getPendingReaction } = await import('../shared/reaction-outbox.js');
const pending = getPendingReaction('occasion-like', occasionId, uid);
if (pending !== undefined) return pending;
return adapter.getUserOccasionLike(occasionId, uid);
}
export async function toggleOccasionCommentLike(occasionId, commentId, uid) {
return adapter.toggleOccasionCommentLike(occasionId, commentId, uid);
}
export async function addOccasionComment(occasionId, comment) {
enforceCooldown('add-occasion-comment', 2500);
enforceMaxLength({
text: { value: comment.text, max: OCCASION_COMMENT_MAX_LENGTH, label: 'التعليق' },
});
return adapter.addOccasionComment(occasionId, comment);
}
export async function deleteOccasion(id) {
return adapter.deleteOccasion(id);
}
export async function updateOccasion(id, patch) {
return adapter.updateOccasion(id, patch);
}
export async function setOccasionArchiveState(id, state) {
return adapter.setOccasionArchiveState(id, state);
}
const _POST_LIMITS = {
idea: {
title:          { max: 80,  label: 'عنوان الفكرة', minLetters: 4 },
description:    { max: 400, label: 'وصف الفكرة',   minLetters: 15 },
benefit:        { max: 300, label: 'الفائدة',      minLetters: 3 },
proposedEntity: { max: 120, label: 'الجهة المقترحة' },
},
occasion: {
title:     { max: 100, label: 'عنوان المناسبة',     minLetters: 4 },
ownerName: { max: 60,  label: 'اسم صاحب المناسبة',  minLetters: 3 },
text:      { max: 300, label: 'النص',               minLetters: 5 },
},
};
function _commentMax(kind) {
return kind === 'idea' ? 500 : OCCASION_COMMENT_MAX_LENGTH;
}
export async function editOwnPost(kind, id, uid, patch) {
const limits = _POST_LIMITS[kind];
if (!limits) throw new Error('نوع المحتوى ما معروف');
const maxSpec = {}, readSpec = {};
for (const [field, spec] of Object.entries(limits)) {
if (patch[field] === undefined) continue;
maxSpec[field] = { value: patch[field], max: spec.max, label: spec.label };
if (spec.minLetters) readSpec[field] = { value: patch[field], label: spec.label, minLetters: spec.minLetters };
}
enforceMaxLength(maxSpec);
enforceReadable(readSpec);
return adapter.editOwnPost(kind, id, uid, patch);
}
export async function deleteOwnPost(kind, id, uid) {
return adapter.deleteOwnPost(kind, id, uid);
}
export async function reportPost(kind, id, uid, reason) {
return adapter.reportPost(kind, id, uid, reason);
}
export async function editOwnComment(kind, parentId, commentId, uid, text) {
enforceMaxLength({ text: { value: text, max: _commentMax(kind), label: 'التعليق' } });
return adapter.editOwnComment(kind, parentId, commentId, uid, text);
}
export async function deleteOwnComment(kind, parentId, commentId, uid) {
return adapter.deleteOwnComment(kind, parentId, commentId, uid);
}
export async function reportComment(kind, parentId, commentId, uid, reason) {
return adapter.reportComment(kind, parentId, commentId, uid, reason);
}
export async function restoreComment(kind, parentId, commentId) {
return adapter.restoreComment(kind, parentId, commentId);
}
export async function approveIdea(id) {
return adapter.approveIdea(id);
}
export async function approveOccasion(id) {
return adapter.approveOccasion(id);
}
export async function getInboxMessages(options = {}) {
return adapter.getInboxMessages(options);
}
export async function addInboxMessage(data) {
enforceCooldown('add-inbox-message', 5000);
enforceMaxLength({
body: { value: data.body, max: 1000, label: 'الرسالة' },
});
return adapter.addInboxMessage(data);
}
export async function markInboxMessageReviewed(id) {
return adapter.markInboxMessageReviewed(id);
}
export async function deleteInboxMessage(id) {
return adapter.deleteInboxMessage(id);
}
export async function getUnreadInboxCount() {
return adapter.getUnreadInboxCount();
}
export async function getReviewQueueCounts() {
return adapter.getReviewQueueCounts();
}
export async function getActiveUrgentAnnouncement() {
return adapter.getActiveUrgentAnnouncement();
}
export async function getUrgentAnnouncementStatus() {
return adapter.getUrgentAnnouncementStatus();
}
export async function publishUrgentAnnouncement(data) {
return adapter.publishUrgentAnnouncement(data);
}
export async function unpublishUrgentAnnouncement() {
return adapter.unpublishUrgentAnnouncement();
}
export async function getContactRecipients() {
return adapter.getContactRecipients();
}
export async function setContactRecipients(data) {
return adapter.setContactRecipients(data);
}
export async function getArchiveStats() {
return adapter.getArchiveStats();
}
export async function purgeArchivedContent(type) {
return adapter.purgeArchivedContent(type);
}
export async function getMembers() {
return adapter.getMembers();
}
export async function getMemberModeration(uid) {
return adapter.getMemberModeration(uid);
}
export async function setMemberModeration(uid, data) {
return adapter.setMemberModeration(uid, data);
}
export async function logAdminAction(entry) {
return adapter.logAdminAction(entry);
}
export async function getActivityLog(options = {}) {
return adapter.getActivityLog(options);
}
export async function exportAllData() {
return adapter.exportAllData();
}
export async function getBackupSummary(snapshot) {
return adapter.getBackupSummary(snapshot);
}
export async function previewBackupImport(snapshot) {
return adapter.previewBackupImport(snapshot);
}
export async function importAllData(snapshot, opts) {
return adapter.importAllData(snapshot, opts);
}
export function formatRelativeTime(iso) {
return _formatRelativeTime(iso);
}
