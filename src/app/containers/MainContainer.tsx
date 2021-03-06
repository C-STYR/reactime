import React, { useEffect, useState } from 'react';
import HeadContainer from './HeadContainer';
import ActionContainer from './ActionContainer';
import StateContainer from './StateContainer';
import TravelContainer from './TravelContainer';
import ButtonsContainer from './ButtonsContainer';
import {
  addNewSnapshots,
  initialConnect,
  setPort,
  setTab,
  deleteTab,
} from '../actions/actions';
import { useStoreContext } from '../store';
import MPID from '../user_id/user_id';

const mixpanel = require('mixpanel').init('12fa2800ccbf44a5c36c37bc9776e4c0', {
  debug: false,
  protocol: 'https',
});

function MainContainer(): any {
  const [timeTravel, setTimeTravel] = useState(false);
  const [store, dispatch] = useStoreContext();
  const { tabs, currentTab, port: currentPort } = store;
  ///const [sideBarView , setSideBar] = useState();
  // add event listeners to background script

  function toggleActionContainer(): void {
    setTimeTravel(!timeTravel)
    const bodyContainer = document.getElementById("bodyContainer");
  
    if (timeTravel) {
      bodyContainer.classList.remove("body-container2");
      bodyContainer.classList.add("body-container1");
     
    }
    else {
      bodyContainer.classList.remove("body-container1");
      bodyContainer.classList.add("body-container2");
    }
  }

  useEffect(() => {
    // only open port once
    if (currentPort) return;
    // open long-lived connection with background script
    const port = chrome.runtime.connect();

    // listen for a message containing snapshots from the background script
    port.onMessage.addListener(
      (message: {
        action: string;
        payload: Record<string, unknown>;
        sourceTab: number;
      }) => {
        const { action, payload, sourceTab } = message;
        let maxTab;
        if (!sourceTab) {
          const tabsArray: any = Object.keys(payload);
          maxTab = Math.max(...tabsArray);
        }
        switch (action) {
          case 'deleteTab': {
            dispatch(deleteTab(payload));
            break;
          }
          case 'changeTab': {
            dispatch(setTab(payload));
            break;
          }
          case 'sendSnapshots': {
            dispatch(setTab(sourceTab));
            // set state with the information received from the background script
            dispatch(addNewSnapshots(payload));
            break;
          }
          case 'initialConnectSnapshots': {
            dispatch(setTab(maxTab));
            dispatch(initialConnect(payload));
            break;
          }
          default:
        }
        return true;
      }
    );

    port.onDisconnect.addListener(() => {
      // disconnecting
    });

    // assign port to state so it could be used by other components
    dispatch(setPort(port));
  });

  /**
   * get set cookies for mixpanel analytics
   **/
  useEffect(() => {
    /**
     * create new user and attempt to read cookies
     */
    const user = new MPID();
    /**
     * If developing turn tracking off by setting user.debug to true;
     * End goal: set an environment variable to automate this toggle
     */
    user.debug = false;

    if (!user.debug) {
      //set current user cookie if it does not exist in cookies;
      if (user.checkDocumentCookie(document)) {
        mixpanel.people.increment(user.get_dId(), 'times');
      } else {
        document.cookie = user.setCookie();
        mixpanel.people.set(user.get_dId(), { times: 1 });
      }
    }

    function mpClickTrack(e) {
      if (!user.debug) {
        mixpanel.track('click', {
          distinct_id: user.distinct_id,
          where: e?.target?.innerText,
        });
      }
    }

    document.addEventListener('click', mpClickTrack);
  }, []);

  if (!tabs[currentTab]) {
    return (
      <div className='error-container'>
        <img src='../assets/logo-no-version.png' height='50px' />
        <a
          href='https://reactime.io/'
          target='_blank'
          rel='noopener noreferrer'
        >
          No React application found. Please visit reactime.io to more info.
        </a>
        <p>
          If you are using a React application, make sure tha you application is
          running in development mode.<br></br>
          NOTE: The React Developer Tools extension is also required for
          Reactime to run, if you do not already have it installed on your
          browser.
        </p>
      </div>
    );
  }
  const { viewIndex, sliderIndex, snapshots, hierarchy } = tabs[currentTab];
  // if viewIndex is -1, then use the sliderIndex instead
  const snapshotView =
    viewIndex === -1 ? snapshots[sliderIndex] : snapshots[viewIndex];
  // cleaning hierarchy and snapshotView from stateless data
  const statelessCleaning = (obj: {
    name?: string;
    componentData?: object;
    state?: string | any;
    stateSnaphot?: object;
    children?: any[];
  }) => {
    const newObj = { ...obj };
    if (newObj.name === 'nameless') {
      delete newObj.name;
    }
    if (newObj.componentData) {
      delete newObj.componentData;
    }
    if (newObj.state === 'stateless') {
      delete newObj.state;
    }
    if (newObj.stateSnaphot) {
      newObj.stateSnaphot = statelessCleaning(obj.stateSnaphot);
    }
    if (newObj.children) {
      newObj.children = [];
      if (obj.children.length > 0) {
        obj.children.forEach(
          (element: { state?: object | string; children?: [] }) => {
            if (element.state !== 'stateless' || element.children.length > 0) {
              const clean = statelessCleaning(element);
              newObj.children.push(clean);
            }
          }
        );
      }
    }
    return newObj;
  };
  const snapshotDisplay = statelessCleaning(snapshotView);
  const hierarchyDisplay = statelessCleaning(hierarchy);
  const bodyGrid = document.getElementsByClassName('body-container');
  let sidebarView = false;
  const hideJumpSidebar = (e) => {
    console.log('jump side bar func worked!', e);
    if (!sidebarView) {
      e.preventDefault();
      for (let i = 0; i < bodyGrid.length; i += 1) {
        bodyGrid[i].classList.add('expand');
      }
      sidebarView = true;
      console.log('if condition worked!');
    } else {
      e.preventDefault();
      for (let i = 0; i < bodyGrid.length; i += 1) {
        bodyGrid[i].classList.remove('expand');
      }
      sidebarView = false;
      console.log('else condition worked!');
    }
  };

  return (
    <div className="main-container">
      {/* <HeadContainer /> */}
      <div id="bodyContainer" className="body-container1">
        <ActionContainer timeTravel={timeTravel}/>
        {snapshots.length ? (
          <StateContainer
            toggleActionContainer={toggleActionContainer}
            viewIndex={viewIndex}
            snapshot={snapshotDisplay}
            hierarchy={hierarchyDisplay}
            snapshots={snapshots}
          />
        ) : null}
        <TravelContainer snapshotsLength={snapshots.length} />
        <ButtonsContainer />
        {/* <button className='show-sidebar' onClick={(e) => hideJumpSidebar(e)}>
          See Jump Functionality
        </button> */}
      </div>
    </div>
  );
}

export default MainContainer;
