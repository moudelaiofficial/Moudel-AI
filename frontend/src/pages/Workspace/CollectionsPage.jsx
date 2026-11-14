
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  ArrowRight,
  FolderPlus,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-react'

import {
  getCollections,
  createCollection,
  deleteCollection,
} from '../../api/collections.js'

export default function CollectionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  // Fetch collections
  const {
    data: collections = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
  })

  // Create collection
  const createMutation = useMutation({
    mutationFn: createCollection,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })

      setCollectionName('')
      setCollectionDescription('')
      setError('')
      setShowCreateModal(false)
    },

    onError: (err) => {
      if (err.code === '23505') {
        setError('A collection with this name already exists.')
      } else {
        setError(err.message || 'Unable to create collection. Please try again.')
      }
    },
  })

  // Delete collection
  const deleteMutation = useMutation({
    mutationFn: deleteCollection,

    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },

    onError: (err) => {
      setActionError(err.message || 'Unable to delete collection.')
    },
  })

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleCreateCollection(event) {
    event.preventDefault()

    const trimmedName = collectionName.trim()

    if (!trimmedName) {
      setError('Please enter a collection name.')
      return
    }

    const alreadyExists = collections.some(
      (collection) =>
        collection.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (alreadyExists) {
      setError('A collection with this name already exists.')
      return
    }

    setError('')

    createMutation.mutate({
      name: trimmedName,
      description: collectionDescription.trim(),
    })
  }

  function handleDeleteCollection(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this collection?'
    )

    if (!confirmed) return

    setActionError('')
    deleteMutation.mutate(id)
  }

  function closeCreateModal() {
    if (createMutation.isPending) return

    setShowCreateModal(false)
    setError('')
    setCollectionName('')
    setCollectionDescription('')
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">

      {/* PAGE INTRO */}
      <section className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8573]">
            <FolderOpen size={13} className="text-[#7153c9]" />
            Research organization
          </div>

          <h1 className="mt-5 font-serif text-4xl tracking-tight sm:text-5xl">
            Your collections.
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-7 text-[#716b61]">
            Bring related research together. Create dedicated spaces
            for topics, projects, and ideas worth exploring.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#7153c9] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#5c40ad]"
        >
          <Plus size={15} />
          New collection
        </button>
      </section>

      {/* COLLECTION SUMMARY */}
      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-[#d9d2bf] py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8573]">
            Total collections
          </p>
          <p className="mt-1 font-serif text-3xl">{collections.length}</p>
        </div>

        <div className="flex w-full items-center gap-2 border border-[#d9d2bf] bg-[#fffdf8] px-3 py-3 sm:w-64">
          <Search size={15} className="text-[#8a8573]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search collections..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-[#aaa296]"
          />
        </div>
      </section>

      {/* COLLECTION GRID */}
      <section className="mt-9">

        {/* Loading */}
        {isLoading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#8a8573]">
              Loading your collections...
            </p>
          </div>

        ) : isError ? (
          /* Fetch error */
          <div className="py-20 text-center">
            <h2 className="font-serif text-2xl">
              Unable to load collections.
            </h2>

            <p className="mt-3 text-sm text-[#8a8573]">
              Something went wrong while fetching your research collections.
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 border border-[#7153c9] px-5 py-3 text-xs font-medium text-[#7153c9] transition hover:bg-[#7153c9] hover:text-white"
            >
              Try again
            </button>
          </div>

        ) : filteredCollections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCollections.map((collection) => (
              <article
                key={collection.id}
                className="group border border-[#d9d2bf] bg-[#fffdf8] p-6 transition hover:border-[#a99bd2]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center bg-[#eee9df] text-[#7153c9]">
                    <FolderOpen size={21} />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCollection(collection.id)}
                    disabled={
                      deleteMutation.isPending &&
                      deleteMutation.variables === collection.id
                    }
                    aria-label={`Delete ${collection.name}`}
                    title="Delete collection"
                    className="p-2 text-[#8a8573] transition hover:bg-[#eee9df] hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </div>

                <h2 className="mt-6 font-serif text-xl">
                  {collection.name}
                </h2>

                <p className="mt-2 min-h-10 text-xs leading-6 text-[#8a8573]">
                  {collection.description || 'No description added.'}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-[#e5dfd2] pt-4">
                  <span className="text-[11px] text-[#8a8573]">
                    {collection.paperCount} papers
                  </span>

                  <span className="text-[10px] text-[#8a8573]">
                    Created {new Date(collection.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ece7db]">
              <FolderPlus size={27} className="text-[#7153c9]" />
            </div>

            <h2 className="mt-6 font-serif text-2xl">
              {searchQuery
                ? 'No collections found.'
                : 'Make space for your ideas.'}
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8a8573]">
              {searchQuery
                ? 'Try searching with a different collection name.'
                : 'Create your first collection to organize research papers by topic, project, or area of interest.'}
            </p>

            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-7 inline-flex items-center gap-2 border border-[#7153c9] px-5 py-3 text-xs font-medium text-[#7153c9] transition hover:bg-[#7153c9] hover:text-white"
              >
                <Plus size={15} />
                Create your first collection
              </button>
            )}
          </div>
        )}

        {actionError && (
          <p role="alert" className="mt-5 text-center text-xs text-red-600">
            {actionError}
          </p>
        )}
      </section>

      {/* DISCOVER LINK */}
      <section className="mt-12 flex flex-col justify-between gap-4 border-t border-[#d9d2bf] pt-7 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-serif text-lg">Looking for something new?</h3>
          <p className="mt-1 text-xs text-[#8a8573]">
            Discover research and build your personal library.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/workspace/discover')}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#7153c9] hover:text-[#5037a5]"
        >
          Explore research <ArrowRight size={15} />
        </button>
      </section>

      {/* CREATE COLLECTION MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1b19]/40 px-4 py-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-collection-title"
            className="w-full max-w-md border border-[#d9d2bf] bg-[#fffdf8] p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8573]">
                  Organize your research
                </p>
                <h2
                  id="create-collection-title"
                  className="mt-2 font-serif text-2xl"
                >
                  New collection
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={createMutation.isPending}
                aria-label="Close modal"
                className="p-2 text-[#8a8573] hover:bg-[#eee9df] disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="collection-name"
                  className="mb-2 block text-xs font-medium"
                >
                  Collection name
                </label>

                <input
                  id="collection-name"
                  autoFocus
                  required
                  maxLength={60}
                  value={collectionName}
                  onChange={(event) => {
                    setCollectionName(event.target.value)
                    setError('')
                  }}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full border border-[#d9d2bf] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[#7153c9]"
                />
              </div>

              <div>
                <label
                  htmlFor="collection-description"
                  className="mb-2 block text-xs font-medium"
                >
                  Description <span className="font-normal text-[#aaa296]">(optional)</span>
                </label>

                <textarea
                  id="collection-description"
                  rows={3}
                  maxLength={200}
                  value={collectionDescription}
                  onChange={(event) => setCollectionDescription(event.target.value)}
                  placeholder="What is this collection about?"
                  className="w-full resize-none border border-[#d9d2bf] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[#7153c9]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createMutation.isPending}
                  className="px-4 py-3 text-xs text-[#716b61] hover:bg-[#eee9df] disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-[#7153c9] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#5c40ad] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
