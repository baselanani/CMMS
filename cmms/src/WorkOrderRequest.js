import { useState, useEffect, useRef } from "react";

export function WorkOrderRequestForm({location}){
	let picRef = useRef(null);
	async function processPicture(e){
		let res = await e.target.files[0].arrayBuffer();
		
		let blob = new Blob([res]);
		let blobUrl = URL.createObjectURL(blob);
		
		let img = new Image();
		img.src = blobUrl;
		
		if(img.completed){
			URL.revokeObjectURL(blobUrl);
		}
		picRef.current.appendChild(img);
		
	}
	return (
	<div className="flex-col work-request-form align-center">
		<div className="flex-col flex-center">
			<h2 className="margin-10">Submit a Work Request</h2>
			<h3>Location: {location}</h3>
		</div>
		<label className="flex-col flex-center">
			Title of the Work Request
			<input className="work-request-input"/>
		</label>
		<label className="flex-col flex-center">
			How can we help?
			<textarea rows="5" className="work-request-input"></textarea>
		</label>
		<label className="flex-col flex-center">
			Your Name
			<input className="work-request-input"/>
		</label>
		<label className="flex-col flex-center">
			Your Email
			<input className="work-request-input"/>
		</label>
		<label className="flex-col flex-center">
			Where or What is having the problem?
			<input className="work-request-input"/>
		</label>
		<label className="flex-col flex-center btn-layout">
			Upload a Picture
			<input onChange={processPicture} type="file" className="work-request-input hidden"/>
		</label>
		<div ref={picRef}></div>
		<button className="submit-btn">Submit</button>
	</div>
	);
}
export function WorkOrderRequest({location}) {
	function WorkOrders(){
		
	}
  return (
				<div className="flex-col">
						Work Orders - {location}
				</div>
  );
}
