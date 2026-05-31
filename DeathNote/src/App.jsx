import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Spin,
} from 'antd'
import './App.css'

const API_URL = 'https://tushed-thunderingly-jenee.ngrok-free.dev/api/deathnote'
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function normalizeEntry(entry, index) {
  const id = entry.id ?? entry._id ?? entry.uuid ?? index + 1
  const writtenAt =
    entry.writtenAt ??
    entry.createdAt ??
    entry.created_at ??
    entry.timestamp ??
    entry.date

  return {
    id,
    displayNumber: entry.id ?? index + 1,
    target: entry.target ?? entry.name ?? 'Unknown',
    deathReason: entry.deathReason ?? entry.reason ?? entry.cause ?? 'Unwritten',
    writtenAt,
  }
}

function formatWrittenAt(value) {
  if (!value) return 'Time unknown'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const parts = dateFormatter.formatToParts(date)
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  const year = parts.find((part) => part.type === 'year')?.value
  const hour = parts.find((part) => part.type === 'hour')?.value
  const minute = parts.find((part) => part.type === 'minute')?.value
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value

  if (!month || !day || !year || !hour || !minute || !dayPeriod) {
    return dateFormatter.format(date)
  }

  return `${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod}`
}

function App() {
  const [form] = Form.useForm()
  const [entries, setEntries] = useState([])
  const [isFetching, setIsFetching] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [listError, setListError] = useState('')

  const sortedEntries = useMemo(
    () =>
      entries
        .map(normalizeEntry)
        .sort((a, b) => {
          const aTime = new Date(a.writtenAt).getTime() || 0
          const bTime = new Date(b.writtenAt).getTime() || 0
          return bTime - aTime
        }),
    [entries],
  )

  async function fetchEntries() {
    setIsFetching(true)
    setListError('')

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: JSON_HEADERS,
      })

      if (!response.ok) {
        throw new Error('The pages refused to open. Try again in a moment.')
      }

      const data = await response.json()
      setEntries(Array.isArray(data) ? data : data.entries ?? data.data ?? [])
    } catch (error) {
      setListError(error.message || 'The written names could not be fetched.')
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialEntries() {
      try {
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: JSON_HEADERS,
        })

        if (!response.ok) {
          throw new Error('The pages refused to open. Try again in a moment.')
        }

        const data = await response.json()

        if (isMounted) {
          setEntries(Array.isArray(data) ? data : data.entries ?? data.data ?? [])
        }
      } catch (error) {
        if (isMounted) {
          setListError(error.message || 'The written names could not be fetched.')
        }
      } finally {
        if (isMounted) {
          setIsFetching(false)
        }
      }
    }

    loadInitialEntries()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(values) {
    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          target: values.target.trim(),
          deathReason: values.deathReason.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('The name could not be written. Check the ink and try again.')
      }

      form.resetFields()
      setStatus({ type: 'success', message: 'The name has been written.' })
      await fetchEntries()
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while writing the name.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return

    setDeletingId(pendingDelete.id)

    try {
      const response = await fetch(`${API_URL}/${pendingDelete.id}`, {
        method: 'DELETE',
        headers: JSON_HEADERS,
      })

      if (!response.ok) {
        throw new Error('The name resisted erasure. Please try again.')
      }

      setEntries((current) =>
        current.filter((entry, index) => normalizeEntry(entry, index).id !== pendingDelete.id),
      )
      setPendingDelete(null)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'The name could not be erased.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#a7191f',
          colorError: '#ff4d4f',
          colorText: '#ead9b5',
          colorTextBase: '#ead9b5',
          colorBgContainer: '#151111',
          colorBorder: '#6f201c',
          borderRadius: 6,
          fontFamily: "'Crimson Text', Georgia, serif",
        },
      }}
    >
      <main className="min-h-screen overflow-hidden bg-[#050303] text-[#ead9b5]">
        <div className="particles" aria-hidden="true" />

        <header className="relative isolate px-5 pb-12 pt-14 text-center sm:pt-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 font-body text-sm uppercase tracking-[0.32em] text-[#b9904d]">
              Shinigami Ledger
            </p>
            <h1 className="font-heading text-5xl font-black leading-none text-[#e9dcc0] death-title sm:text-7xl lg:text-8xl">
              DEATH NOTE
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-body text-xl text-[#bda983]">
              Write a name. Seal their fate.
            </p>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-7 px-4 pb-16 sm:px-6 lg:grid-cols-[0.92fr_1.35fr] lg:px-8">
          <article className="notebook-card self-start rounded-md border border-[#6d241f] bg-[#120e0d]/95 p-5 shadow-2xl sm:p-7">
            <div className="mb-6 border-b border-[#5b1a17] pb-5">
              <p className="font-body text-sm uppercase tracking-[0.24em] text-[#a97937]">
                Write in the Death Note
              </p>
              <h2 className="mt-2 font-heading text-3xl text-[#f0dfbd]">Add Entry</h2>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                label="Target Name"
                name="target"
                rules={[
                  { required: true, message: 'A name must be written first.' },
                  { whitespace: true, message: 'A blank name carries no fate.' },
                ]}
              >
                <Input placeholder="Enter the name..." size="large" className="death-input" />
              </Form.Item>

              <Form.Item
                label="Cause of Death"
                name="deathReason"
                rules={[
                  { required: true, message: 'The fate needs a cause.' },
                  { whitespace: true, message: 'Describe the fate in ink.' },
                ]}
              >
                <Input.TextArea
                  placeholder="Describe the fate..."
                  autoSize={{ minRows: 5, maxRows: 8 }}
                  className="death-input"
                />
              </Form.Item>

              {status.message ? (
                <div className={`status-message ${status.type}`}>{status.message}</div>
              ) : null}

              <Button
                htmlType="submit"
                size="large"
                type="primary"
                loading={isSubmitting}
                block
                className="write-button"
              >
                {isSubmitting ? 'Writing...' : 'Write in the Death Note'}
              </Button>
            </Form>
          </article>

          <section className="paper-panel rounded-md border border-[#4a2218] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex flex-col gap-3 border-b border-[#7b6242]/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-sm uppercase tracking-[0.24em] text-[#70411f]">
                  The Written Names
                </p>
                <h2 className="mt-2 font-heading text-3xl text-[#231713]">
                  The Written Names
                </h2>
              </div>
              <p className="count-pill">
                {sortedEntries.length} {sortedEntries.length === 1 ? 'name has' : 'names have'}{' '}
                been written
              </p>
            </div>

            {listError ? <div className="list-error">{listError}</div> : null}

            {isFetching ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="entry-card skeleton-card" key={index}>
                    <Skeleton active paragraph={{ rows: 4 }} title />
                  </div>
                ))}
              </div>
            ) : sortedEntries.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {sortedEntries.map((entry) => (
                  <article
                    className={`entry-card fade-in ${
                      deletingId === entry.id ? 'is-erasing' : ''
                    }`}
                    key={entry.id}
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <span className="page-number">#{entry.displayNumber}</span>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => setPendingDelete(entry)}
                        aria-label={`Erase ${entry.target}`}
                      >
                        x
                      </button>
                    </div>
                    <dl className="space-y-3">
                      <div>
                        <dt>Target:</dt>
                        <dd className="target-name">{entry.target}</dd>
                      </div>
                      <div>
                        <dt>Cause of Death:</dt>
                        <dd>{entry.deathReason}</dd>
                      </div>
                      <div>
                        <dt>Written at:</dt>
                        <dd>{formatWrittenAt(entry.writtenAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-mark" aria-hidden="true" />
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No names have been written yet."
                />
              </div>
            )}
          </section>
        </section>

        <Modal
          centered
          open={Boolean(pendingDelete)}
          title="Erase this name?"
          okText="Erase name"
          cancelText="Keep it"
          okButtonProps={{ danger: true, loading: Boolean(deletingId) }}
          onOk={confirmDelete}
          onCancel={() => setPendingDelete(null)}
          className="death-modal"
        >
          <Spin spinning={Boolean(deletingId)}>
            <p>Are you sure you want to erase this name?</p>
            {pendingDelete ? <strong>{pendingDelete.target}</strong> : null}
          </Spin>
        </Modal>
      </main>
    </ConfigProvider>
  )
}

export default App
