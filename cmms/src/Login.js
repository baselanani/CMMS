import { useState, useEffect, useRef } from "react";

function Login(props) {
	
	function handler(e){
		e.preventDefault();
		props.setPage("CMMS");
	}
  return (
  <div className="login flex-col flex-center">
  <div className="flex-col flex-center" style={{border:"3px solid #a1a1a1", padding:"35px"}}>
	<h1 style={{borderBottom:"2px solid", padding:"10px"}}>Login</h1>
	<form onSubmit={handler} method="POST" action="/login" className="flex-col flex-center gap-20">
		<label className="flex-col flex-center margin-20">
			Username
			<input placeholder="Username" name="username" className="margin-20 inherit login-input"/>
		</label>
		<label className="flex-col flex-center margin-20">
			Password
			<input placeholder="Password" type="password" name="password" className="margin-20 inherit login-input"/>
		</label>
		<button type="submit" className="inherit margin-20 login-button">Login</button>
	</form>
  </div>
  </div>
  );
}

export default Login;
