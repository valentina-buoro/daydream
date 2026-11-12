export default function RequestSent (){
    return(
       <main className="center">
          <div className="success-icon">✓</div>
          <div className="eyebrow">INTRODUCTION RECEIVED</div>
          <h1>You’re on our list.</h1>
          <p>
            Our team will review your request. Once approved,
            <br />
            you’ll receive a secure email link to create your password.
          </p>
          <button className="primary" onClick={() => {}}>
            Back to overview →
          </button>
        </main> 
    )
}
