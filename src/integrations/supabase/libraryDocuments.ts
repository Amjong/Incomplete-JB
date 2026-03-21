import type { WorkspaceDocument } from '../../store/useLibraryWorkspaceStore'
import { getSupabaseClient } from './client'
import type { Database } from './types'

type LibraryDocumentRow = Database['public']['Tables']['library_documents']['Row']

function normalizeNumberArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === 'number') : []
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function mapRowToWorkspaceDocument(row: LibraryDocumentRow): WorkspaceDocument {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    blockDepths: normalizeNumberArray(row.block_depths),
    blockIds: normalizeStringArray(row.block_ids),
    status: 'active',
    updatedAt: row.updated_at,
    categoryId: null,
    isLocalOnly: false,
  }
}

function mapWorkspaceDocumentToRow(doc: WorkspaceDocument, userId: string) {
  return {
    user_id: userId,
    slug: doc.slug,
    title: doc.title,
    body: doc.body,
    block_depths: doc.blockDepths,
    block_ids: doc.blockIds,
  }
}

export async function listLibraryDocuments(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('library_documents')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as LibraryDocumentRow[]).map(mapRowToWorkspaceDocument)
}

export async function insertLibraryDocument(doc: WorkspaceDocument, userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('library_documents')
    .insert(mapWorkspaceDocumentToRow(doc, userId))
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRowToWorkspaceDocument(data as LibraryDocumentRow)
}

export async function updateLibraryDocument(doc: WorkspaceDocument, userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('library_documents')
    .update(mapWorkspaceDocumentToRow(doc, userId))
    .eq('id', doc.id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRowToWorkspaceDocument(data as LibraryDocumentRow)
}
