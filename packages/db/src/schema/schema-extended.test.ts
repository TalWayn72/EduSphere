import { describe, it, expect } from 'vitest';

import { annotations, annotationTypeEnum, annotationsRLS, annotationsIndexes } from './annotations';
import { collab_documents, crdt_updates, collab_sessions } from './collaboration';
import { contentItems, contentTypeEnum, contentItemsRLS, contentItemsIndexes } from './contentItems';
import { courses, coursesRLS, coursesIndexes } from './courses';
import { discussions as discussionTs, discussion_messages, discussion_participants, discussionTypeEnum, messageTypeEnum } from './discussion';
import { discussions as discussionsLegacy, discussionsRLS, discussionsIndexes } from './discussions';
import { files, filesRLS, filesIndexes } from './files';
import { modules as modulesTable, modulesRLS, modulesIndexes } from './modules';
import { organizations, organizationsRLS, organizationsIndexes } from './organizations';
import { tags, tagsRLS } from './tags';
import { userCourses, enrollmentStatusEnum, userCoursesRLS, userCoursesIndexes } from './userCourses';
import { userProgress, userProgressRLS, userProgressIndexes } from './userProgress';

describe('annotations table (annotations.ts)', () => {
  it('is defined', () => { expect(annotations).toBeDefined(); });
  it('has id column', () => { expect(annotations.id).toBeDefined(); });
  it('has contentItemId column', () => { expect(annotations.contentItemId).toBeDefined(); });
  it('has userId column', () => { expect(annotations.userId).toBeDefined(); });
  it('has type column', () => { expect(annotations.type).toBeDefined(); });
  it('has text column', () => { expect(annotations.text).toBeDefined(); });
  it('has highlightedText column', () => { expect(annotations.highlightedText).toBeDefined(); });
  it('has startOffset and endOffset', () => { expect(annotations.startOffset).toBeDefined(); expect(annotations.endOffset).toBeDefined(); });
  it('has color column', () => { expect(annotations.color).toBeDefined(); });
  it('has createdAt and updatedAt', () => { expect(annotations.createdAt).toBeDefined(); expect(annotations.updatedAt).toBeDefined(); });
  it('annotationTypeEnum is defined', () => { expect(annotationTypeEnum).toBeDefined(); });
  it('annotationsRLS SQL is defined', () => { expect(annotationsRLS).toBeDefined(); });
  it('annotationsIndexes SQL is defined', () => { expect(annotationsIndexes).toBeDefined(); });
});

describe('collab_documents table', () => {
  it('is defined', () => { expect(collab_documents).toBeDefined(); });
  it('has id column', () => { expect(collab_documents.id).toBeDefined(); });
  it('has tenant_id column', () => { expect(collab_documents.tenant_id).toBeDefined(); });
  it('has entity_type column', () => { expect(collab_documents.entity_type).toBeDefined(); });
  it('has entity_id column', () => { expect(collab_documents.entity_id).toBeDefined(); });
  it('has name column', () => { expect(collab_documents.name).toBeDefined(); });
  it('has ydoc_snapshot column', () => { expect(collab_documents.ydoc_snapshot).toBeDefined(); });
  it('has timestamps', () => { expect(collab_documents.created_at).toBeDefined(); expect(collab_documents.updated_at).toBeDefined(); });
});

describe('crdt_updates table', () => {
  it('is defined', () => { expect(crdt_updates).toBeDefined(); });
  it('has document_id column', () => { expect(crdt_updates.document_id).toBeDefined(); });
  it('has update_data column', () => { expect(crdt_updates.update_data).toBeDefined(); });
  it('has created_at column', () => { expect(crdt_updates.created_at).toBeDefined(); });
});

describe('collab_sessions table', () => {
  it('is defined', () => { expect(collab_sessions).toBeDefined(); });
  it('has document_id column', () => { expect(collab_sessions.document_id).toBeDefined(); });
  it('has user_id column', () => { expect(collab_sessions.user_id).toBeDefined(); });
  it('has connection_id column', () => { expect(collab_sessions.connection_id).toBeDefined(); });
  it('has last_active column', () => { expect(collab_sessions.last_active).toBeDefined(); });
});

describe('contentItems table', () => {
  it('is defined', () => { expect(contentItems).toBeDefined(); });
  it('has moduleId column', () => { expect(contentItems.moduleId).toBeDefined(); });
  it('has title column', () => { expect(contentItems.title).toBeDefined(); });
  it('has type column', () => { expect(contentItems.type).toBeDefined(); });
  it('has content column', () => { expect(contentItems.content).toBeDefined(); });
  it('has orderIndex column', () => { expect(contentItems.orderIndex).toBeDefined(); });
  it('has fileId column', () => { expect(contentItems.fileId).toBeDefined(); });
  it('has createdAt updatedAt', () => { expect(contentItems.createdAt).toBeDefined(); expect(contentItems.updatedAt).toBeDefined(); });
  it('contentTypeEnum is defined', () => { expect(contentTypeEnum).toBeDefined(); });
  it('contentItemsRLS SQL is defined', () => { expect(contentItemsRLS).toBeDefined(); });
  it('contentItemsIndexes SQL is defined', () => { expect(contentItemsIndexes).toBeDefined(); });
});

describe('courses table (courses.ts)', () => {
  it('is defined', () => { expect(courses).toBeDefined(); });
  it('has id column', () => { expect(courses.id).toBeDefined(); });
  it('has tenantId column', () => { expect(courses.tenantId).toBeDefined(); });
  it('has title column', () => { expect(courses.title).toBeDefined(); });
  it('has slug column', () => { expect(courses.slug).toBeDefined(); });
  it('has instructorId column', () => { expect(courses.instructorId).toBeDefined(); });
  it('has isPublished column', () => { expect(courses.isPublished).toBeDefined(); });
  it('has estimatedHours column', () => { expect(courses.estimatedHours).toBeDefined(); });
  it('has createdAt updatedAt', () => { expect(courses.createdAt).toBeDefined(); expect(courses.updatedAt).toBeDefined(); });
  it('coursesRLS SQL is defined', () => { expect(coursesRLS).toBeDefined(); });
  it('coursesIndexes SQL is defined', () => { expect(coursesIndexes).toBeDefined(); });
});

describe('discussions table (discussion.ts)', () => {
  it('is defined', () => { expect(discussionTs).toBeDefined(); });
  it('has tenant_id column', () => { expect(discussionTs.tenant_id).toBeDefined(); });
  it('has course_id column', () => { expect(discussionTs.course_id).toBeDefined(); });
  it('has title column', () => { expect(discussionTs.title).toBeDefined(); });
  it('has creator_id column', () => { expect(discussionTs.creator_id).toBeDefined(); });
  it('has discussion_type column', () => { expect(discussionTs.discussion_type).toBeDefined(); });
  it('discussionTypeEnum is defined', () => { expect(discussionTypeEnum).toBeDefined(); });
  it('messageTypeEnum is defined', () => { expect(messageTypeEnum).toBeDefined(); });
});

describe('discussion_messages table', () => {
  it('is defined', () => { expect(discussion_messages).toBeDefined(); });
  it('has discussion_id column', () => { expect(discussion_messages.discussion_id).toBeDefined(); });
  it('has user_id column', () => { expect(discussion_messages.user_id).toBeDefined(); });
  it('has content column', () => { expect(discussion_messages.content).toBeDefined(); });
  it('has message_type column', () => { expect(discussion_messages.message_type).toBeDefined(); });
  it('has parent_message_id column', () => { expect(discussion_messages.parent_message_id).toBeDefined(); });
});

describe('discussion_participants table', () => {
  it('is defined', () => { expect(discussion_participants).toBeDefined(); });
  it('has discussion_id column', () => { expect(discussion_participants.discussion_id).toBeDefined(); });
  it('has user_id column', () => { expect(discussion_participants.user_id).toBeDefined(); });
});

describe('discussions table (discussions.ts legacy)', () => {
  it('is defined', () => { expect(discussionsLegacy).toBeDefined(); });
  it('has authorId column', () => { expect(discussionsLegacy.authorId).toBeDefined(); });
  it('has content column', () => { expect(discussionsLegacy.content).toBeDefined(); });
  it('has upvotes column', () => { expect(discussionsLegacy.upvotes).toBeDefined(); });
  it('discussionsRLS SQL is defined', () => { expect(discussionsRLS).toBeDefined(); });
  it('discussionsIndexes SQL is defined', () => { expect(discussionsIndexes).toBeDefined(); });
});

describe('files table', () => {
  it('is defined', () => { expect(files).toBeDefined(); });
  it('has tenantId column', () => { expect(files.tenantId).toBeDefined(); });
  it('has uploadedBy column', () => { expect(files.uploadedBy).toBeDefined(); });
  it('has filename column', () => { expect(files.filename).toBeDefined(); });
  it('has originalName column', () => { expect(files.originalName).toBeDefined(); });
  it('has mimeType column', () => { expect(files.mimeType).toBeDefined(); });
  it('has size column', () => { expect(files.size).toBeDefined(); });
  it('has storageKey column', () => { expect(files.storageKey).toBeDefined(); });
  it('filesRLS SQL is defined', () => { expect(filesRLS).toBeDefined(); });
  it('filesIndexes SQL is defined', () => { expect(filesIndexes).toBeDefined(); });
});

describe('modules table (modules.ts)', () => {
  it('is defined', () => { expect(modulesTable).toBeDefined(); });
  it('has courseId column', () => { expect(modulesTable.courseId).toBeDefined(); });
  it('has title column', () => { expect(modulesTable.title).toBeDefined(); });
  it('has orderIndex column', () => { expect(modulesTable.orderIndex).toBeDefined(); });
  it('has createdAt updatedAt', () => { expect(modulesTable.createdAt).toBeDefined(); expect(modulesTable.updatedAt).toBeDefined(); });
  it('modulesRLS SQL is defined', () => { expect(modulesRLS).toBeDefined(); });
  it('modulesIndexes SQL is defined', () => { expect(modulesIndexes).toBeDefined(); });
});

describe('organizations table', () => {
  it('is defined', () => { expect(organizations).toBeDefined(); });
  it('has name column', () => { expect(organizations.name).toBeDefined(); });
  it('has slug column', () => { expect(organizations.slug).toBeDefined(); });
  it('has description column', () => { expect(organizations.description).toBeDefined(); });
  it('has isActive column', () => { expect(organizations.isActive).toBeDefined(); });
  it('has createdAt updatedAt', () => { expect(organizations.createdAt).toBeDefined(); expect(organizations.updatedAt).toBeDefined(); });
  it('organizationsRLS SQL is defined', () => { expect(organizationsRLS).toBeDefined(); });
  it('organizationsIndexes SQL is defined', () => { expect(organizationsIndexes).toBeDefined(); });
});

describe('tags table', () => {
  it('is defined', () => { expect(tags).toBeDefined(); });
  it('has tenantId column', () => { expect(tags.tenantId).toBeDefined(); });
  it('has name column', () => { expect(tags.name).toBeDefined(); });
  it('has slug column', () => { expect(tags.slug).toBeDefined(); });
  it('has color column', () => { expect(tags.color).toBeDefined(); });
  it('has createdAt column', () => { expect(tags.createdAt).toBeDefined(); });
  it('tagsRLS SQL is defined', () => { expect(tagsRLS).toBeDefined(); });
});

describe('userCourses table', () => {
  it('is defined', () => { expect(userCourses).toBeDefined(); });
  it('has userId column', () => { expect(userCourses.userId).toBeDefined(); });
  it('has courseId column', () => { expect(userCourses.courseId).toBeDefined(); });
  it('has status column', () => { expect(userCourses.status).toBeDefined(); });
  it('has enrolledAt column', () => { expect(userCourses.enrolledAt).toBeDefined(); });
  it('has completedAt column', () => { expect(userCourses.completedAt).toBeDefined(); });
  it('enrollmentStatusEnum is defined', () => { expect(enrollmentStatusEnum).toBeDefined(); });
  it('userCoursesRLS SQL is defined', () => { expect(userCoursesRLS).toBeDefined(); });
  it('userCoursesIndexes SQL is defined', () => { expect(userCoursesIndexes).toBeDefined(); });
});

describe('userProgress table', () => {
  it('is defined', () => { expect(userProgress).toBeDefined(); });
  it('has userId column', () => { expect(userProgress.userId).toBeDefined(); });
  it('has contentItemId column', () => { expect(userProgress.contentItemId).toBeDefined(); });
  it('has isCompleted column', () => { expect(userProgress.isCompleted).toBeDefined(); });
  it('has progress column', () => { expect(userProgress.progress).toBeDefined(); });
  it('has timeSpent column', () => { expect(userProgress.timeSpent).toBeDefined(); });
  it('has lastAccessedAt column', () => { expect(userProgress.lastAccessedAt).toBeDefined(); });
  it('userProgressRLS SQL is defined', () => { expect(userProgressRLS).toBeDefined(); });
  it('userProgressIndexes SQL is defined', () => { expect(userProgressIndexes).toBeDefined(); });
});
