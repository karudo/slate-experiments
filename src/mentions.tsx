import React, {useCallback, useRef, useEffect, useState, FC, PropsWithChildren, KeyboardEventHandler} from 'react'
import { max } from 'lodash'
import {createPortal} from 'react-dom';
import {Editor, Transforms, Range, createEditor, Descendant, CustomTypes} from 'slate'
import { withHistory } from 'slate-history'
import {
  Slate,
  Editable,
  ReactEditor,
  withReact,
  useSelected,
  useFocused,
} from 'slate-react'

import {CustomElement, DynamicContentElement} from './custom-types'

import { QweHolder } from './hooktests';

export const Portal: FC<PropsWithChildren<{}>> = ({ children }) => {
  return typeof document === 'object'
    ? createPortal(children, document.body)
    : null
}

const vars = [
  'poezd',
  'lopata',
  'brevno'
]

function isElement(x: any): x is CustomElement {
  return !!x.type;
}

function findAllDc(value: Descendant[]): DynamicContentElement[] {
  const dces: DynamicContentElement[] = [];

  function walkDeep(children: Descendant[]) {
    for (const el of children) {
      if (isElement(el)) {
        if (el.type === 'dc') {
          dces.push(el);
        }
        walkDeep(el.children);
      }
    }
  }
  walkDeep(value);

  return dces;
}

const createMKEditor = () => withDynamicContent(withReact(withHistory(createEditor())));

const MentionExample = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState<Descendant[]>(initialValue)
  const [target, setTarget] = useState<Range | undefined>()
  const [targetCoords, setTargetCoords] = useState<{ top: number; left: number } | undefined>()
  const [index, setIndex] = useState(0)
  const renderElement = useCallback((props: any) => <Element {...props} />, [])
  const [editor] = useState(createMKEditor)

  // const chars = CHARACTERS.slice(0, 10)

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      if (target) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            const prevIndex = index >= vars.length - 1 ? 0 : index + 1
            setIndex(prevIndex)
            break
          case 'ArrowUp':
            event.preventDefault()
            const nextIndex = index <= 0 ? vars.length - 1 : index - 1
            setIndex(nextIndex)
            break
          case 'Tab':
          case 'Enter':
            event.preventDefault()
            Transforms.select(editor, target)
            insertDynamicContent(editor, vars[index])
            setTarget(undefined)
            break
          case 'Escape':
            event.preventDefault()
            setTarget(undefined)
            break
        }
      }
    },
    [index, target]
  )

  useEffect(() => {
    if (target) {
      const domRange = ReactEditor.toDOMRange(editor, target)
      const rect = domRange.getBoundingClientRect()
      setTargetCoords({
        top: rect.top + window.pageYOffset + 24,
        left: rect.left + window.pageXOffset
      })
    } else {
      setTargetCoords(undefined);
    }
  }, [editor, index, target])

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={value => {
        setValue(value)
        const { selection } = editor

        if (selection && Range.isCollapsed(selection)) {
          const [start, end] = Range.edges(selection)
          const charBefore = Editor.end(editor, start)
          const before = charBefore && Editor.before(editor, charBefore)
          const beforeRange = before && Editor.range(editor, before, start)
          const beforeText = beforeRange && Editor.string(editor, beforeRange)

          /*
          console.log({
            start,
            end,
            charBefore,
            before,
            beforeRange,
            beforeText,
          })
          */

          if (beforeText === '$') {
            setTarget(beforeRange)
            setIndex(0)
            return
          }
        }

        setTarget(undefined)
      }}
    >
      <Editable
        renderElement={renderElement}
        onKeyDown={onKeyDown}
        placeholder="Enter some text..."
      />
      <pre>{JSON.stringify(value, null, 2)}</pre>
      {targetCoords && (
        <Portal>
          <div
            ref={ref}
            style={{
              ...targetCoords,
              position: 'absolute',
              zIndex: 1,
              padding: '3px',
              background: 'white',
              borderRadius: '4px',
              boxShadow: '0 1px 5px rgba(0,0,0,.2)',
            }}
          >
            {vars.map((variable, i) => (
              <div
                key={variable}
                style={{
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: i === index ? '#B4D5FF' : 'transparent',
                }}
                onClick={() => {
                  insertDynamicContent(editor, variable)
                }}
              >
                {variable}
              </div>
            ))}
          </div>
        </Portal>
      )}
    </Slate>
  )
}

const withDynamicContent = (editor: CustomTypes['Editor']) => {
  const { isInline, isVoid } = editor

  editor.isInline = element => {
    return element.type === 'dc' ? true : isInline(element)
  }

  editor.isVoid = element => {
    return element.type === 'dc' ? true : isVoid(element)
  }

  return editor
}

const insertDynamicContent = (editor: CustomTypes['Editor'], name: string) => {
  const maxId = max(findAllDc(editor.children).map(dc => dc.uid)) || 0;
  const dc: DynamicContentElement = {
    type: 'dc',
    uid: maxId + 1,
    dc: {
      type: 'var',
      name
    },
    children: [{ text: '' }],
  }
  Transforms.insertNodes(editor, dc)
  Transforms.move(editor)
}

const Element: FC<PropsWithChildren<{attributes: any; element: any;}>> = props => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'dc':
      return <DynamicContent {...props} />
    default:
      return <p {...attributes}>{children}</p>
  }
}

const DynamicContent: FC<PropsWithChildren<{attributes: any; element: DynamicContentElement}>> = ({ attributes, children, element }) => {
  const selected = useSelected()
  const focused = useFocused()
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        boxShadow: selected && focused ? '0 0 0 2px #FFD5FF' : '0 0 0 1px #B4D5FF',
        cursor: 'pointer'
      }}
    >
      {element.dc.name}
      {children}
    </span>
  )
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'This example shows how you might implement a simple $-mentions feature that lets users autocomplete mentioning a user by their username. Which, in this case means Star Wars characters.',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'This example shows how you might implement a simple $-mentions feature that lets users autocomplete mentioning a user by their username. Which, in this case means Star Wars characters.',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      { text: 'Try mentioning characters, like ' },
      {
        type: 'dc',
        uid: 21,
        dc: {
          type: 'var',
          name: 'seven'
        },
        children: [{ text: '' }],
      },
      { text: ' or ' },
      {
        type: 'dc',
        uid: 22,
        dc: {
          type: 'var',
          name: 'six'
        },
        children: [{ text: '' }],
      },
      { text: '!' },
    ],
  },
]

export default MentionExample
