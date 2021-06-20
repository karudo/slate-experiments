import React, {useEffect, useLayoutEffect, useState} from 'react';

class Qwe extends React.Component<{ n: number }, any> {
  componentDidMount() {
    console.log(`didMount ${this.props.n}`)
  }
  componentWillUnmount() {
    console.log(`willUnmount ${this.props.n}`)
  }

  render() {
    return this.props.children || null;
  }
}
function Qwe2({n, children}: {n: number; children: any}) {
  useLayoutEffect(() => {
    console.log(`+useLayoutEffect ${n}`)
    return () => console.log(`-useLayoutEffect ${n}`)
  }, [n])
  useEffect(() => {
    console.log(`+useEffect ${n}`)
    return () => console.log(`-useEffect ${n}`)
  }, [n])

  return children || null
}

export function QweHolder() {
  const [show, setShow] = useState(true);
  return (
    <div>
      <button onClick={() => setShow(v => !v)}>qwe</button>
      {show && (
        <>
          <Qwe n={1}>
            <Qwe n={2}>
              <Qwe n={3}>1</Qwe>
            </Qwe>
          </Qwe>
          <Qwe2 n={1}>
            <Qwe2 n={2} >
              <Qwe2 n={3} children="2" />
            </Qwe2>
          </Qwe2>
        </>
      )}
    </div>
  )
}
