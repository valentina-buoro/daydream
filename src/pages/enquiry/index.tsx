import { useState } from 'react'
import ChoiceScreen from '../../components/enquiry-components/choice_screen'
import WholesaleFlow from '../../components/enquiry-components/wholesale_flow'
import EventFlow from '../../components/enquiry-components/event_flow'
import RequestSent from '../../components/enquiry-components/request_sent'

export default function EnquiryPage() {
  const [path, setPath] = useState('choose')

  return (
    <main className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <header className="brand-bar">
        <button className="brand" onClick={() => setPath('choose')} aria-label="Return to start">
          DAYDREAM
        </button>
        <a className="login-link" href="/login">Already approved? Log in</a>
      </header>

      {path === 'choose' && <ChoiceScreen onChoose={setPath} />}
      {path === 'wholesale' && <WholesaleFlow onBack={() => setPath('choose')} />}
      {path === 'event' && <EventFlow onBack={() => setPath('choose')} />}
      {path === 'thanks' && <RequestSent/>}
    </main>
  )
}
