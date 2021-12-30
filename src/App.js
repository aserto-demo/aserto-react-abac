import './App.css';
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from 'oidc-react';
// import { useAserto } from '@aserto/aserto-react'
import Select from 'react-select'

const locations = [
  {
    label: 'New York',
    value: 'America/New_York',
  },
  {
    label: 'Auckland',
    value: 'Pacific/Auckland',
  },
  {
    label: 'Paris',
    value: 'Europe/Paris',
  },
  {
    label: 'Tokyo',
    value: 'Asia/Tokyo',
  }
];

const devices = [
  {
    label: "MacBook",
    value: "MacBook"
  },
  {
    label: "iPhone",
    value: "iPhone"
  },
  {
    label: "PC",
    value: "PC"
  },
  {
    label: "Android",
    value: "Android"
  }
]

const projects = [
  {
    label: "Project Red",
    value: "red",
  },
  {
    label: "Project Blue",
    value: "blue",
  }
]

const apiOrigin = process.env.REACT_APP_NETLIFY ? `/.netlify/functions/api-server` : process.env.REACT_APP_API_ORIGIN

function App() {

  const auth = useAuth();
  const [message, setMessage] = useState(false)
  const [location, setLocation] = useState()
  const [project, setProject] = useState()
  const [device, setDevice] = useState()
  const [timeInTimezone, setTimeInTimezone] = useState()
  const [user, setUser] = useState()
  const { init, loading, getDisplayState, error: asertoError, reload } = useAserto();
  const isAuthenticated = auth.userData?.id_token ? true : false

  const accessSensitiveInformation = useCallback(async (projectId) => {
    try {
      if (!auth.isLoading) {
        const accessToken = auth.userData?.id_token
        const sensitiveInformationURL = `${apiOrigin}/api/projects/${projectId}`;
        const sensitiveDataResponse = await fetch(sensitiveInformationURL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        try {
          const res = await sensitiveDataResponse.json();
          setMessage(res.secretMessage)
        } catch (e) {
          //In case no access is given, the response will return 403 and not return a JSON response
          setMessage(sensitiveDataResponse.status)
        }
      }

    } catch (e) {
      console.log(e.message);
    }

  }, [auth.isLoading, auth.userData?.id_token])

  const updateUser = useCallback(async (key, value) => {
    try {
      setMessage(false)
      const accessToken = auth.userData?.id_token
      const updateUserURL = `${apiOrigin}/api/update/user`;
      console.log("updateUserURL", updateUserURL, apiOrigin)
      await fetch(updateUserURL, {
        updateUserURL,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          value,
          email: auth.userData.profile.email
        }),
      });
    } catch (e) {
      console.log(e.message);
    }
  }, [auth.userData?.id_token, auth.userData?.profile.email])

  useEffect(() => {
    async function initAserto() {
      try {
        const token = auth.userData?.id_token

        if (token) {
          await init({
            serviceUrl: apiOrigin,
            accessToken: token,
            policyRoot: 'policyabac',
            throwOnError: false
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    if (!asertoError && isAuthenticated) {
      // initAserto();
    }

    if (!loading && !isAuthenticated) {
      auth.signIn()
    }

    setUser(auth.userData?.profile)

    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, auth.userData?.id_token, auth.isLoading]);

  const onLocationChange = (e) => {
    updateUser('location', e.label)
    updateUser('timezone', e.value)

    const options = {
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      timeZone: e.value,
      timeZoneName: 'short'
    };

    setTimeInTimezone(new Date().toLocaleString('en-US', options))
    setLocation(e.value)
    reload()

  }

  if (asertoError) {
    return <div><h1>Error encountered</h1><p>{asertoError}</p></div>;
  }

  const onDeviceChange = (e) => {
    updateUser('device', e.value)
    setDevice(e.value)
    reload()
  }

  const onProjectChange = (e) => {
    updateUser('project', e.value)
    setProject(e.value)
    reload()
  }

  const displayStateMapApiProjectRed = (loading || asertoError) ? { visible: false, enabled: false } : getDisplayState("GET", "/api/projects/red");
  const displayStateMapApiProjectBlue = (loading || asertoError) ? { visible: false, enabled: false } : getDisplayState("GET", "/api/projects/blue");
  return (
    <div className="container">
      <div className="header">
        <div className="logo-container">
          <div className="logo"></div>
          <div className="brand-name"></div>
        </div>
      </div>

      <div className="user-controls">
        {isAuthenticated && !loading &&
          <>
            <div className="user-info">{auth.userData?.profile?.email}</div>
            <div className="separator"></div>
            <div className="auth-button"><div onClick={() => auth.signOut("/")}>Log Out</div></div>
          </>
        }
        {!isAuthenticated && <div className="auth-button"><div onClick={() => auth.signIn("/")}>Login</div></div>}
      </div>

      <div className="main">
        {loading && <div className="loading">Loading...</div>}

        {!loading && isAuthenticated &&
          <>
            <div className="top-main">
              <div className="welcome-message">
                Welcome {auth.userData?.profile?.email}!
              </div>
              <div>
                <div className="center-main">

                  {displayStateMapApiProjectRed?.visible && <div>
                    <button className="primary-button" disabled={!displayStateMapApiProjectRed?.enabled} onClick={() => accessSensitiveInformation('red')}>Get Project Red Secret </button>
                  </div>}
                  {displayStateMapApiProjectBlue?.visible && <div>
                    <button className="primary-button" disabled={!displayStateMapApiProjectBlue?.enabled} onClick={() => accessSensitiveInformation('blue')}>Get Project Blue Secret</button>
                  </div>}
                </div>
                <div className="message-container">
                  {message && message !== 403 &&
                    <>
                      <div className="lottie"></div>
                      <div className="message">{message}</div>
                    </>
                  }
                  {message && message === 403 &&
                    <>
                      <div className="sad-lottie"></div>
                      <div className="message">No access to sensitive information</div>
                    </>
                  }
                </div>
              </div>
            </div>
            <div className="bottom-main">
              <div className="controllers">
                <div className="dropdown">
                  <Select
                    name="projects"
                    title="Select project"
                    options={projects}
                    defaultValue={projects.filter(p => p.value === project)}
                    onChange={onProjectChange}
                  />
                </div>
                <div className="dropdown">
                  <Select
                    name="location"
                    title="Select location"
                    options={locations}
                    defaultValue={locations.filter(l => l.value === location)}
                    onChange={onLocationChange}
                  />
                </div>
                <div className="dropdown">
                  <Select
                    name="devices"
                    title="Select device"
                    options={devices}
                    onChange={onDeviceChange}
                    defaultValue={devices.filter(d => d.value === device)}
                  />
                </div>
              </div>
              <div className="timezone">
                <div>{displayStateMapApiProjectRed?.visible && `${user?.email} is assigned to Project Red`}</div>
                <div>{displayStateMapApiProjectBlue?.visible && `${user?.email} is assigned to Project Blue`}</div>
                <div>{timeInTimezone && `Time in selected timezone: ${timeInTimezone}`}</div>
              </div>
            </div>

          </>
        }
      </div>
    </div>
  );
}

export default App;