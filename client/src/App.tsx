import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import axios from 'axios'

function App() {
  const [data, setData] = useState(0)

  useEffect(() => {

    axios.get('http://localhost:3000/api/data').then(res => {
      setData(res.data);
    }).catch(err => {
      console.error("Error fetchinf data: ", err)
    })

  }, [])

  return (
    <>
      <div>
        {data.message}
      </div>
    </>
  )
}

export default App
