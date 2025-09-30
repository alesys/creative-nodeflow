import React from 'react';
import CreativeNodeFlow from './CreativeNodeFlow';
import EnvironmentDebugger from './components/EnvironmentDebugger';

// Uncomment the line below for environment debugging
// import EnvDiagnostic from './components/EnvDiagnostic';

function App() {
  return (
    <div className="App">
      <EnvironmentDebugger />
      {/* <EnvDiagnostic /> */}
      <CreativeNodeFlow />
    </div>
  );
}

export default App;
