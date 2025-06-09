import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toBase64 } from '../../utils/base64'
import { Container } from '../../components/container'
import { Flex } from '../../components/flex'
import { annotationLabels } from 'ui-labelling-shared'

interface Annotation {
  url: string
  payload: { window: { width: number; height: number } }
  screenshot: { data: ArrayBuffer }
}

export default function AnnotationPage() {
  const { query, push, isReady } = useRouter()
  const [annotation, setAnnotation] = useState<Annotation | null>(null)

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then(r => r.json())
      .then(({ data }) => setAnnotation(data))
      .catch(console.error)
  }, [isReady, query.id])

  if (!annotation) return <p>Loading…</p>

  const {
    url,
    payload: { window: win },
    screenshot,
  } = annotation

  return (
    <main id="annotation-view">
      <Container>
        <button id="back-btn" onClick={() => push('/')}>
          Back
        </button>
        <h3>{url}</h3>
        <Flex>
          <div
            id="annotation-img"
            style={{

              border: '1px solid #aaa',
              borderRight: 'none',
              backgroundSize: 'contain',
              backgroundImage: `url('data:image/png;base64,${toBase64(
                screenshot.data,
              )}')`,
              position: 'relative',
              width: '90%',
              height: '80vw'
            }}
          >
          </div>
          <Flex style={{ 
            flexGrow: '1',
            border: '1px solid #aaa',
            backgroundColor: '#fff',
            padding: '4px',
            flexDirection: 'column'
            }}>
              {
                Object.entries(annotationLabels).map(label => {
                  return (
                    <div style={{
                      width: '100%',
                      backgroundColor: label[1],
                      padding: '4px',
                      fontSize: '16px'
                    }}>
                      {label[0]}
                    </div>
                  )
                })
              }
          </Flex>
        </Flex>
    </Container>
    </main>
  )
}
