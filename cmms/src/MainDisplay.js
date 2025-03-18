import {useState, createContext, useContext} from 'react';
import {MainDashboard } from './MainDashboard.js';
import SideMenu from './SideMenu.js';
import WorkOrders from './WorkOrders.js';

export const SetMainView = createContext(<MainDashboard />);

function MainDisplay(props) {
	const [mainView, setMainView] = useState(<MainDashboard />);
		
  return (
	<div style={{backgroundColor:"#f2f2f2"}}>
		<div style={{paddingTop:"15px", paddingBottom:"15px", paddingLeft:"15px"}}>
		CMMS Application
		</div>
		<div className="flex-row border-2">
			<SetMainView.Provider value={setMainView}>
				<SideMenu setPage={props.setPage}/>
			</SetMainView.Provider>
			<div className="flex-row flex-grow justify-center">
				{mainView}	
			</div>
		</div>
	</div>
  );
}

export default MainDisplay;
