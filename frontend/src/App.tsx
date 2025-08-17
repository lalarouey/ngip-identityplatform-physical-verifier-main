import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import PhysicalVerifier from 'pages/PhysicalVerifier';

function App() {
  const theme = createTheme({
    fontFamily: 'Open Sans, sans-serif',
    primaryColor: 'cyan',
  });

  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <PhysicalVerifier />
    </MantineProvider>
  );
}

export default App;
