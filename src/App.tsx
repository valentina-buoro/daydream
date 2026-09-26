
import Routes from './routes'
import { useMediaQuery } from 'usehooks-ts'

const Download = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <p style={{ marginBottom: "16px" }}>
        Please access app on a laptop or desktop
      </p>
      
    </div>
  );
};


function App() {
 const matches = useMediaQuery("(max-width:1023px)");

 return matches ? <Download /> : <Routes />;
 
}

export default App
