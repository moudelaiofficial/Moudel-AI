
import { supabase } from '../lib/supabase.js'

const COLLECTION_SELECT = `
  id,
  name,
  description,
  created_at,
  collection_papers(count)
`

function throwIfError(error) {
  if (error) {
    throw error
  }
}

function mapCollection(collection) {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description ?? '',
    createdAt: collection.created_at,
    paperCount: collection.collection_papers?.[0]?.count ?? 0,
  }
}

// Fetch collections belonging to the authenticated user.
export async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_SELECT)
    .order('created_at', { ascending: false })

  throwIfError(error)

  return (data ?? []).map(mapCollection)
}

// Create a new collection.

export async function createCollection({ name, description = '' }) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    throw new Error('You must be signed in to create a collection.')
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
    })
    .select(COLLECTION_SELECT)
    .single()

  throwIfError(error)

  return mapCollection(data)
}


// Update an existing collection.
export async function updateCollection({ id, name, description = '' }) {
  const { data, error } = await supabase
    .from('collections')
    .update({
      name: name.trim(),
      description: description.trim(),
    })
    .eq('id', id)
    .select(COLLECTION_SELECT)
    .single()

  throwIfError(error)

  return mapCollection(data)
}

// Delete a collection.
export async function deleteCollection(id) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)

  throwIfError(error)
}
