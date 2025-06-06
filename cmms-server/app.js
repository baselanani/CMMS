const express = require("express");
const http = require("http");
const crypto = require("crypto");
const sql = require("mysql2");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

let app = express();
let users = express.Router();
let teams = express.Router();
let locations = express.Router();
let workOrders = express.Router();
let assets = express.Router();
let parts = express.Router();


//Database Connection
let con = sql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE
});

const strOfChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const permissions =
{
	can_view_all_locations: 0,
	can_add_locations: 1,
	can_edit_locations: 2,
	can_del_locations: 3,
	can_approve_users: 4,
	can_view_users_info: 5,
	can_edit_users_info:  6,  
	can_del_users: 7,
	can_create_teams: 8,
	can_edit_teams: 9,
	can_del_teams: 10,
	can_add_work_orders: 11,
	can_del_work_orders: 12,
	can_edit_work_orders: 13,
	can_complete_all_work_orders: 14,
	can_view_all_work_orders: 15, 
	can_add_parts: 16,
	can_edit_parts: 17,
	can_del_parts: 18,
	can_add_assets: 19,
	can_edit_assets: 20,
	can_del_assets: 21
};

//Database query
function query(q, vArr=[]){
	return new Promise((resolve, rej)=>{
		con.query(q, vArr, function(err, res){
			if(err) rej(err);
			resolve(res);
		});
	});
}

const salt = process.env.SCRYPT_SALT;
function encr(p){
	return new Promise( (res, rej)=>{
		crypto.scrypt(p, salt+"#"+p[0]+"p0257"+p[0]+"@"+p[0], 32, {N:16384}, (err, hash)=>{
			res(hash.toString('hex'));
		});
	}
	)
}
function genId() {
    return new Promise((resolve, rej) => {
        let result = "";
            crypto.randomBytes(32, (err, res) => {
                if (err)
                    return;
                for (let j = 0; j < 32; j++) {
                    result += strOfChars[res[j] % strOfChars.length];
                }
                resolve(result);
            });   
    });
}
function hasPermission(user_perms, perm){
	if(user_perms&(1<<perm)== 0){
		return false;
	}
	return true;
}

/* Database Initialization */
async function startDatabaseInit(){
	async function initDatabase(){
		//con.query("CREATE DATABASE cmms", (err, res)=>{
			//if(err){throw err;}
			let res;
			res = await query("CREATE TABLE locations (id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(255), PRIMARY KEY(id))");
			res = await query("CREATE TABLE work_orders(id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(255) NOT NULL, description VARCHAR(10000), image VARCHAR(255) NULL, due_date TIMESTAMP NULL, started_date TIMESTAMP NULL, completed_date TIMESTAMP NULL, status VARCHAR(255) NULL, priority TINYINT NULL, work_type VARCHAR(50) NULL, PRIMARY KEY(id), loc_id INT UNSIGNED NOT NULL, FOREIGN KEY(loc_id) REFERENCES locations(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE assets(id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(255) NOT NULL, image VARCHAR(255) NULL, make VARCHAR(255) NULL, model VARCHAR(255) NULL, PRIMARY KEY(id), loc_id INT UNSIGNED NOT NULL, FOREIGN KEY(loc_id) REFERENCES locations(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE parts(id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(255) NOT NULL, image VARCHAR(255) NULL, qrcode VARCHAR(255) NULL, price DOUBLE NULL, qty DOUBLE NULL, location VARCHAR(255), PRIMARY KEY(id), loc_id INT UNSIGNED NOT NULL, FOREIGN KEY(loc_id) REFERENCES locations(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE teams(id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(255) NOT NULL, loc_id INT UNSIGNED, FOREIGN KEY(loc_id) REFERENCES locations(id) ON DELETE CASCADE , PRIMARY KEY(id))");
			res = await query("CREATE TABLE roles(id INT UNSIGNED AUTO_INCREMENT, name VARCHAR(100), PRIMARY KEY(id), permissions INT UNSIGNED)");
			res = await query("CREATE TABLE users(id INT UNSIGNED AUTO_INCREMENT, role_id INT UNSIGNED, FOREIGN KEY(role_id) REFERENCES roles(id), username VARCHAR(255) NOT NULL, password CHAR(64) NOT NULL, name VARCHAR(255) NOT NULL, image VARCHAR(255) NULL, location VARCHAR(255), PRIMARY KEY(id), INDEX(username, password))");
			res = await query("CREATE TABLE team_users(user_id INT UNSIGNED, team_id INT UNSIGNED, FOREIGN KEY(team_id) REFERENCES teams(id) , FOREIGN KEY(user_id) REFERENCES users(id))");
			res = await query("CREATE TABLE work_assigned_users(work_order_id INT UNSIGNED, user_id INT UNSIGNED,	FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE , FOREIGN KEY(user_id) REFERENCES users(id))");
			res = await query("CREATE TABLE work_assigned_teams(work_order_id INT UNSIGNED, team_id INT UNSIGNED, FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE, FOREIGN KEY(team_id) REFERENCES teams(id))");
			res = await query("CREATE TABLE work_orders_logs(id INT UNSIGNED AUTO_INCREMENT, action VARCHAR(30), time TIMESTAMP, PRIMARY KEY(id), work_order_id INT UNSIGNED, FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE assets_logs(id INT UNSIGNED AUTO_INCREMENT, PRIMARY KEY(id), action VARCHAR(30), time TIMESTAMP, asset_id INT UNSIGNED, FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE parts_logs(id INT UNSIGNED AUTO_INCREMENT, PRIMARY KEY(id), action VARCHAR(30), time TIMESTAMP, part_id INT UNSIGNED, FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE work_orders_assets(id INT UNSIGNED AUTO_INCREMENT, PRIMARY KEY(id), work_order_id INT UNSIGNED, FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE, asset_id INT UNSIGNED, FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE)");
			res = await query("CREATE TABLE work_orders_parts(id INT UNSIGNED AUTO_INCREMENT, PRIMARY KEY(id), work_order_id INT UNSIGNED, FOREIGN KEY(work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE, part_id INT UNSIGNED, FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE)");
			
			res = await query("CREATE TABLE custom_fields(id INT UNSIGNED AUTO_INCREMENT, PRIMARY KEY(id), entity_type TINYINT, name VARCHAR(255) NOT NULL, type VARCHAR(50) NOT NULL)");
			res = await query("CREATE TABLE entity_custom_fields(entity_id INT UNSIGNED, entity_type TINYINT, custom_field_id INT UNSIGNED, value TEXT NULL, PRIMARY KEY(entity_id, entity_type, custom_field_id), FOREIGN KEY(custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE)");
			
			res = await query("CREATE TABLE token_store(jti VARCHAR(36) NOT NULL, PRIMARY KEY(jit), blocked_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
			
			res = await query(`
					CREATE TRIGGER work_order_insert AFTER INSERT ON work_orders FOR EACH ROW
					BEGIN
					   INSERT INTO work_orders_logs(action, time, work_order_id) VALUES('INSERT',CURRENT_TIMESTAMP, NEW.id); 
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER work_order_update AFTER UPDATE ON work_orders FOR EACH ROW
					BEGIN
					   INSERT INTO work_orders_logs(action, time, work_order_id) VALUES('UPDATE',CURRENT_TIMESTAMP, NEW.id);
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER work_order_delete AFTER DELETE ON work_orders FOR EACH ROW
					BEGIN
					   INSERT INTO work_orders_logs(action, time, work_order_id) VALUES('DELETE',CURRENT_TIMESTAMP, OLD.id); 
					END ;
				   `);
			///////////////////////
			res = await query(`
					CREATE TRIGGER asset_insert AFTER INSERT ON assets FOR EACH ROW
					BEGIN
					   INSERT INTO assets_logs(action, time, asset_id) VALUES('INSERT',CURRENT_TIMESTAMP, NEW.id); 
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER asset_update AFTER UPDATE ON assets FOR EACH ROW
					BEGIN
					   INSERT INTO assets_logs(action, time, asset_id) VALUES('UPDATE',CURRENT_TIMESTAMP, NEW.id); 
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER asset_delete AFTER DELETE ON assets FOR EACH ROW
					BEGIN
					   INSERT INTO assets_logs(action, time, asset_id) VALUES('DELETE',CURRENT_TIMESTAMP, OLD.id); 
					END ;
				   `);
				   
			///////////////////////
			res = await query(`
					CREATE TRIGGER part_insert AFTER INSERT ON parts FOR EACH ROW
					BEGIN
					   INSERT INTO parts_logs(action, time, part_id) VALUES('INSERT',CURRENT_TIMESTAMP, NEW.id); 
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER part_update AFTER UPDATE ON parts FOR EACH ROW
					BEGIN
					   INSERT INTO parts_logs(action, time, part_id) VALUES('UPDATE',CURRENT_TIMESTAMP, NEW.id); 
					END ;
				   `);
			res = await query(`
					CREATE TRIGGER part_delete AFTER DELETE ON parts FOR EACH ROW
					BEGIN
					   INSERT INTO parts_logs(action, time, part_id) VALUES('DELETE',CURRENT_TIMESTAMP, OLD.id); 
					END ;
				   `);
			//////////////////////////
			
			res = await query("INSERT INTO roles VALUES(1,'Manager', 4294967295)");
			res = await query("INSERT INTO roles VALUES(2,'Planner', 1785857)");
			res = await query("INSERT INTO roles VALUES(3,'Electrician', 1785857)");
			res = await query("INSERT INTO roles VALUES(4,'Mechanic', 1785857)");
			res = await query("INSERT INTO roles VALUES(5,'Technician', 1785857)");
		//});
	}
	async function testData(){
		let res;
		res = await query("INSERT INTO locations SET name='OFFICE'");
		res = await query("INSERT INTO users(name, username, password, role_id) VALUES('basel', 'b','123', 1), ('ahmad', 'a', '123', 1)");
		let d = (new Date).setDate((new Date()).getDate()+1);
		res = await query("INSERT INTO work_orders(name, description, due_date, status, priority, work_type, loc_id) VALUES('fix lamp', 'lamp stopped working', ?, 'pending', 2, 'corrective', 1)", [new Date(d)]);
		res = await query("INSERT INTO assets SET name='fridge', make='unknown', model='2015', loc_id=1");
		res = await query("INSERT INTO assets SET name='stove', make='ao', model='2017', loc_id=1");
		res = await query("INSERT INTO assets SET name='building', make='NA', model='NA', loc_id=1");
		res = await query("INSERT INTO work_orders_assets SET work_order_id=1, asset_id=1");
		res = await query("INSERT INTO work_orders_assets SET work_order_id=1, asset_id=2");
		res = await query("INSERT INTO work_orders(name, description, due_date, status, priority, work_type, loc_id) VALUES('fix AC', 'The AC stopped working', ?, 'pending', 3, 'corrective', 1)", [new Date(d)]);
		res = await query("INSERT INTO work_orders_assets SET work_order_id=2, asset_id=3");
		res = await query("INSERT INTO work_orders_assets SET work_order_id=2, asset_id=2");
		res = await query("INSERT INTO work_assigned_users(work_order_id, user_id) VALUES(1, 1)");
		res = await query("INSERT INTO work_assigned_users(work_order_id, user_id) VALUES(1, 2)");
		res = await query("INSERT INTO teams(name, loc_id) VALUES('day shift', 1)");
		res = await query("INSERT INTO team_users SET user_id=1, team_id=1");
		res = await query("INSERT INTO work_assigned_teams(work_order_id, team_id) VALUES(1, 1)");
		res = await query("INSERT INTO work_assigned_teams(work_order_id, team_id) VALUES(2, 1)");
	}
	await initDatabase();
	console.log("done creating the tables");
	await testData();
	console.log("done filling the tables with test data");
}
//Make sure you have some schema (for example: cmms) created by running the query "CREATE DATABASE cmms;" in MySQL.
//Then, execute the following line only once, and comment it afterwards.
startDatabaseInit();

//Middleware
app.use(rateLimit({windowMs: 20 * 60 * 1000, max:700}));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Routes
app.use("/users", users);
app.use("/teams", teams);
app.use("/locations", locations);
app.use("/work_orders", workOrders);
app.use("/assets", assets);
app.use("/parts", parts);

//DATABASE ENTITY TYPES
const ASSET_TYPE = 1;
const PART_TYPE = 2;


//Database Allowed Columns
const locationsColumns =
["name"];

const teamsColumns =
["name", "loc_id"];

const workOrdersColumns = 
["status","priority","work_type",
"completed_date","started_date",
"due_date","description","image", "name"];

const assetsColumns =
["name", "make", "model", "image"];

const partsColumns =
["name", "image", "qrcode", "price", "qty", "location"];


let authenticate = (req, res, next)=>{
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if(token == null){
		return res.status(401).send("Token is required.");
	}
	
	jwt.verify(token,accessTokenSecret, (err, user)=>{
		if(err){
			return res.status(403).send("Invalid token.");
		}
		req.user = user;
		next();
	});
};

let pagination = (req, res, next)=>{
	if(req.query.loc_id == undefined){
		req.client.destroy();
		return;
	}
	req.params.n = (Number(req.params.n)-1)*25;
	req.params.n = (req.params.n < 0 || isNaN(req.params.n))?0:req.params.n;
	req.query.sort ??= "name";
	next();
};

let isValidColumn = (column, allowedColumns) => {
	return allowedColumns.includes(column);
};

http.createServer(app).listen(1337);

app.get("/", (req, res)=>{
	res.send("root");
});

//------------------------
/*Start of: /users endpoint*/
//------------------------

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

users.post("/register", async (req, res)=>{
	if(req.body.password != undefined && req.body.username != undefined && req.body.name != undefined){
		let results = await query("SELECT username FROM users WHERE username = ?", [req.body.username]);
		if(results.length == 0){
			await query("INSERT INTO users(name, username, password) VALUES(?, ?, ?)", [req.body.name, req.body.username, await encr(req.body.password)]);
			res.send("done");
		}
		else{
			res.send("error");
		}
	}
	else{
		req.client.destroy();
	}
});
users.post("/login", async (req, res)=>{
	if(req.body.username == undefined || req.body.password == undefined){
		res.send("error");
		return;
	}
	let results = await query("SELECT users.id, users.name, username, image, location, permissions FROM users INNER JOIN roles ON(role_id = roles.id) WHERE username=? AND password = ?",[req.body.username, await encr(req.body.password)]);
	if(results.length){
		const accessToken = jwt.sign(results[0], accessTokenSecret, {expiresIn: "30m"});
		const refreshToken = jwt.sign({id: results[0].id, username: results[0].username, jti: crypto.randomUUID()}, refreshTokenSecret, {expiresIn: "24h"});
		
		res.json({ accessToken, refreshToken, user: results[0] });
	}
	else{
		res.send("error");
	}
});

users.post("/token", async (req, res)=>{
	const { token } = req.body;
	if(!token){
		res.status(401).send("Refresh token is required!");
		return;
	}
	
	
	jwt.verify(token, refreshTokenSecret, (err, user) => {
		if(err){
			return res.status(403).send("Invalid refresh token.");
		}
		
		//verify token is not used before
		let results = await query("SELECT * FROM token_store WHERE jti = ? ", [user.jti]);
		if(results.length > 0){
			return res.status(403).send("Invalid refresh token.");
		}
		
		//fetch user data from the database to update accessToken
		results = await query("SELECT users.id, users.name, username, image, location, permissions FROM users INNER JOIN roles ON(role_id = roles.id) WHERE id = ?", [user.id]);
		if(results.length == 0){
			return res.status(403).send("internal error");
		}
		
		const accessToken = jwt.sign(results[0], accessTokenSecret, {expiresIn:"30m"});
		const refreshToken = jwt.sign({id: user.id, username: user.username, jti: crypto.randomUUID()}, refreshTokenSecret, {expiresIn:"24h"});
		
		//add old refreshToken to database to block reusing it.
		await query("INSERT INTO token_store SET jti = ? ", [user.jti]);
		
		res.json({ accessToken, refreshToken });
	});
});
//------------------------
/*End of: /users endpoint*/
//------------------------

//------------------------
/*Start of: /teams endpoint*/
//------------------------
teams.use(authenticate);

teams.get("/page/:n", pagination, async (req, res)=>{
	const offset = req.params.n;
	let queryStr;
	
	if(typeof req.query.sort != "string" || !isValidColumn(req.query.sort.toLowerCase(), teamsColumns)){
		req.query.sort = "name";
	}
	
	if(typeof req.query?.sort_order == "string" && req.query.sort_order.toLowerCase() == "desc"){
		queryStr = sql.format("SELECT id, name FROM teams WHERE loc_id = ? ORDER BY ?? DESC LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	else{
		queryStr = sql.format("SELECT id, name FROM teams WHERE loc_id = ? ORDER BY ?? LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	con.query(queryStr, (err, results)=>{
		if(err){
			res.send("error");
		}
		res.json(results);
	});
});
teams.post("/", async (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_create_teams)){
		res.status(403).send("unauthorized");
		return;
	}
	let results = await query("INSERT INTO teams(name, loc_id) VALUES(?, ?)", [req.body.name, req.body.loc_id]);
	results==undefined?res.send("error"):res.send("done");
});

teams.put("/:id", async (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_edit_teams)){
		res.status(403).send("unauthorized");
		return;
	}
	let results = await query("UPDATE teams SET name=?, loc_id=? WHERE id=?", [req.body.name, req.body.loc_Id, req.params.id]);
	results==undefined?res.send("error"):res.send("done");
});
teams.delete("/:id", (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_del_teams)){
		res.status(403).send("unauthorized");
		return;
	}
	
	con.query(sql.format("DELETE FROM teams WHERE id=?"), [req.params.id], (err, results)=>{
					if(err){
						res.send("error");
						return;
					}
					res.send("done");
	});
});
//------------------------
/*End of: /teams endpoint*/
//------------------------
//------------------------
/*Start of: /locations endpoint*/
//------------------------
locations.use(authenticate);

locations.get("/", (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_view_all_locations)){
		res.status(403).send("unauthorized");
		return;
	}
	con.query(sql.format("SELECT * FROM locations"), (err, results)=>{
					if(err){
						res.send("error");
						return;
					}
					res.json(results);
	});
});
locations.post("/", (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_add_locations)){
		res.status(403).send("unauthorized");
		return;
	}
	con.query("INSERT INTO locations(name) VALUES(?)", [req.body.name],(err, results)=>{
			if(err){
				res.send("error");
				return;
			}
			res.send("done");
	});
});
locations.put("/:id", async (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_edit_locations)){
		res.status(403).send("unauthorized");
		return;
	}
	let results = await query("UPDATE locations SET name=? WHERE id=?", [req.body.newName, req.params.id]);
	results==undefined?res.send("error"):res.json(results);
});
locations.delete("/:id", (req, res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_del_locations)){
		res.status(403).send("unauthorized");
		return;
	}
	if(typeof req.params.id != "number"){
		res.status(403).send("invalid id");
		return;
	}
	con.query(sql.format("DELETE FROM locations WHERE id=?"), [req.params.id], (err, results)=>{
					if(err){throw err;}
					res.send("done");
	});
});
//------------------------
/*End of: /locations endpoint*/
//------------------------

//------------------------
/*Start of: /work_orders endpoint*/
//------------------------
workOrders.use(authenticate);

workOrders.get("/page/:n", pagination, (req,res)=>{
	if(!hasPermission(req.user.permissions, permissions.can_view_all_work_orders)){
		res.send("nop");
		return;
	}
	let queryStr;
	const offset = req.params.n;
	
	if(typeof req.query.sort != "string" || !isValidColumn(req.query.sort.toLowerCase(), workOrdersColumns)){
		req.query.sort = "name";
	}
	
	if(typeof req.query?.sort_order == "string" && req.query.sort_order.toLowerCase() == "desc"){
		queryStr = sql.format("SELECT * FROM work_orders WHERE loc_id = ? ORDER BY ?? DESC LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	else{
		queryStr = sql.format("SELECT * FROM work_orders WHERE loc_id = ? ORDER BY ?? LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	con.query(queryStr, (err, results)=>{
		if(err){throw err;}
		res.json(results);
	});
});
workOrders.get("/:id", async (req,res)=>{
	if(hasPermission(req.user.permissions, permissions.can_view_all_work_orders)){
		let results = await query("SELECT * FROM work_orders WHERE id=?", [req.params.id]);
		res.send(results);
	}
	else{
		//check if work order is assigned to user
		let results = await query("SELECT users.id FROM work_assigned_users INNER JOIN users ON(user_id = users.id) WHERE work_order_id = ? AND user_id=?", [req.params.id, req.user.id]);
		if(results.length){
			results = await query("SELECT * FROM work_orders WHERE id=?", [req.params.id]);
			res.send(results);
		}
		else{
			res.status(403).send("Unauthorized access.");
		}
	}
});
workOrders.get("/:id/logs/", async (req,res)=>{
	if(hasPermission(req.user.permissions, permissions.can_view_all_work_orders)){
		let results = await query("SELECT * FROM work_orders_logs WHERE work_order_id=?", [req.params.id]);
		res.send(results);
	}
	else{
		//check if work order is assigned to user
		let results = await query("SELECT users.id FROM work_assigned_users INNER JOIN users ON(user_id = users.id) WHERE work_order_id = ? AND user_id=?", [req.params.id, req.user.id]);
		if(results.length){
			results = await query("SELECT * FROM work_orders_logs WHERE work_order_id=?", [req.params.id]);
			res.send(results);
		}
		else{
			res.status(403).send("Unauthorized access.");
		}
	}
});


workOrders.get("/:id/assets", async (req,res)=>{
	if(hasPermission(req.user.permissions, permissions.can_view_all_work_orders)){
		let results = await query("SELECT assets.* FROM assets INNER JOIN work_orders_assets ON(assets.id = work_orders_assets.asset_id) WHERE work_order_id = ?", [req.params.id]);
		res.send(results);
	}
	else{
		//check if work order is assigned to user
		let results = await query("SELECT users.id FROM work_assigned_users INNER JOIN users ON(user_id = users.id) WHERE work_order_id = ? AND user_id=?", [req.params.id, req.user.id]);
		if(results.length){
			results = await query("SELECT assets.* FROM assets INNER JOIN work_orders_assets ON(assets.id = work_orders_assets.asset_id) WHERE work_order_id = ?", [req.params.id]);
			res.send(results);
		}
		else{
			res.status(403).send("Unauthorized access.");
		}
	}
});
workOrders.get("/:id/parts", async (req,res)=>{
	if(hasPermission(req.user.permissions, permissions.can_view_all_work_orders)){
		let results = await query("SELECT parts.* FROM parts INNER JOIN work_orders_parts ON(parts.id = work_orders_parts.part_id) WHERE work_order_id = ?", [req.params.id]);
		res.send(results);
	}
	else{
		let results = await query("SELECT users.id FROM work_assigned_users INNER JOIN users ON(user_id = users.id) WHERE work_order_id = ? AND user_id=?", [req.params.id, req.user.id]);
		if(results.length){
			results = await query("SELECT parts.* FROM parts INNER JOIN work_orders_parts ON(parts.id = work_orders_parts.part_id) WHERE work_order_id = ?", [req.params.id]);
			res.send(results);
		}
		else{
			res.status(403).send("Unauthorized access.");
		}
	}
});

workOrders.get("/:id/users", async (req, res)=>{
	let results = await query("SELECT users.name, users.image FROM work_assigned_users INNER JOIN users ON(users.id = user_id) WHERE work_order_id = ?", [req.params.id]);
	res.send(results);
});
workOrders.get("/:id/teams", async (req, res)=>{
	let results = await query("SELECT teams.name, teams.location FROM work_assigned_teams INNER JOIN teams ON(teams.id = team_id) WHERE work_order_id = ?", [req.params.id]);
	res.send(results);
});
workOrders.post("/", (req, res)=>{
	if(req.body.loc_id == undefined){
		req.client.destroy();
		return;
	}
	con.query("INSERT INTO work_orders(name, loc_id) VALUES(?, ?)", [req.body.name, req.body.loc_id], (err, result)=>{
		if(err){throw err;}
		res.send("done");
	});
	
});

workOrders.put("/:id", (req, res)=>{
	let q = sql.format("UPDATE work_orders SET ? WHERE id=?", [req.body.edit, req.params.id]);
	con.query(q, (err, result)=>{
		if(err){throw err;}
		res.send("done");
	});
});

workOrders.delete("/:id", (req, res)=>{
	con.query("DELETE FROM work_orders WHERE id=?", [req.params.id], (err, result)=>{
		if(err){throw err}
		res.send("done");
	});
});

//------------------------
/*End of: /work_orders endpoint*/
//------------------------

//------------------------
/*Start of: /assets endpoint*/
//------------------------
assets.use(authenticate);

assets.use((req, res, next)=>{
	if(req.method == "GET" || req.method == "DELETE"){
		if(req.query.loc_id == undefined){
			req.client.destroy();
			return;
		}
	}
	else{
		if(req.body.loc_id == undefined){
			req.client.destroy();
			return;
		}
	}
	next();
});

assets.get("/page/:n", pagination, (req,res)=>{
	let queryStr;
	const offset = req.params.n;
	if(typeof req.query.sort != "string" || !isValidColumn(req.query.sort.toLowerCase(), assetsColumns)){
		req.query.sort = "name";
	}
	if(typeof req.query.sort_order == "string" && req.query.sort_order.toLowerCase() == "desc"){
		queryStr = sql.format("SELECT * FROM assets WHERE loc_id = ? ORDER BY ?? DESC LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	else{
		queryStr = sql.format("SELECT * FROM assets WHERE loc_id = ? ORDER BY ?? LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	con.query(queryStr, (err, results)=>{
		if(err){throw err;}
		res.json(results);
	});
});
assets.get("/:id", async (req,res)=>{
	let results = await query("SELECT * FROM assets WHERE id = ?", [req.params.id]);
	res.send(results);
});
assets.post("/", (req, res)=>{
	con.query("INSERT INTO assets(name, loc_id) VALUES(?, ?)", [req.body.name, req.body.loc_id], (err, result)=>{
		if(err){throw err;}
		console.log("Successfully added a new asset!");
		res.send("done");
	});
	
});

assets.get("custom_fields", async (req, res)=>{
	let result = await query("SELECT id, name, type FROM custom_fields WHERE entity_type = ?", [ASSET_TYPE]);
});
assets.post("/custom_fields", async (req, res)=>{	
	if(typeof req.body.name != "string" || typeof req.body.type != "string"){
		res.send("error");
		return;
	}
	
	let result = await query("INSERT INTO custom_fields(name, type, entity_type) VALUES(?, ?, ?)", [req.body.name, req.body.type, ASSET_TYPE]);
	res.send("done");
});
assets.post("/:id/custom_fields/:custom_field_id", async (req, res)=>{
	await query("INSERT INTO entity_custom_fields SET entity_id=?, entity_type=?, custom_field_id=?, value=?",[req.params.id, ASSET_TYPE, req.params.custom_field_id, req.body.value]);
	res.send("done");
});

assets.patch("/:id",(req, res)=>{
	if(!isValidColumn(req.body.field, assetsColumns)){
		res.send("error");
		return;
	}
	let q = sql.format("UPDATE assets SET ?? = ? WHERE id=?", [req.body.field, req.body.value, req.params.id]);
	con.query(q, (err, result)=>{
		if(err){
			res.send("error");
			return;
		}
		res.send("done");
	});
});

assets.delete("/:id", (req, res)=>{
	con.query("DELETE FROM assets WHERE id=?", [req.params.id], (err, result)=>{
		if(err){throw err}
		console.log("an asset was deleted!");
		res.send("done");
	});
});
//------------------------
/*End of: /assets endpoint*/
//------------------------
/////////////////////////////////////////////////////////

//------------------------
/*Start of: /parts endpoint*/
//------------------------
parts.use(authenticate);

parts.use((req, res, next)=>{
	if(req.method == "GET" || req.method == "DELETE"){
		if(req.query.loc_id == undefined){
			req.client.destroy();
			return;
		}
	}
	else{
		if(req.body.loc_id == undefined){
			req.client.destroy();
			return;
		}
	}
	next();
});

parts.get("/page/:n", pagination, (req,res)=>{
	let queryStr;
	const offset = req.params.n;
	if(typeof req.query.sort != "string" || !isValidColumn(req.query.sort.toLowerCase(), partsColumns)){
		req.query.sort = "name";
	}
	if(typeof req.query.sort_order == "string" && req.query.sort_order.toLowerCase() == "desc"){
		queryStr = sql.format("SELECT * FROM parts WHERE loc_id = ? ORDER BY ?? DESC LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	else{
		queryStr = sql.format("SELECT * FROM parts WHERE loc_id = ? ORDER BY ?? LIMIT ?, 25", [req.query.loc_id,req.query.sort, offset]);
	}
	con.query(queryStr, (err, results)=>{
		if(err){throw err;}
		res.json(results);
	});
});
parts.get("/:id", async (req,res)=>{
	let results = await query("SELECT * FROM parts WHERE id = ?", [req.params.id]);
	res.send(results);
});
parts.post("/", (req, res)=>{
	con.query("INSERT INTO parts(name, loc_id) VALUES(?, ?)", [req.body.name, req.body.loc_id], (err, result)=>{
		if(err){throw err;}
		console.log("Successfully added a new part!");
		res.send("done");
	});
	
});

parts.get("custom_fields", async (req, res)=>{
	let result = await query("SELECT id, name, type FROM custom_fields WHERE entity_type = ?", [PART_TYPE]);
});
parts.post("/custom_fields", async (req, res)=>{	
	if(typeof req.body.name != "string" || typeof req.body.type != "string"){
		res.send("error");
		return;
	}
	
	let result = await query("INSERT INTO custom_fields(name, type, entity_type) VALUES(?, ?, ?)", [req.body.name, req.body.type, PART_TYPE]);
	res.send("done");
});
parts.post("/:id/custom_fields/:custom_field_id", async (req, res)=>{
	await query("INSERT INTO entity_custom_fields SET entity_id=?, entity_type=?, custom_field_id=?, value=?",[req.params.id, PART_TYPE, req.params.custom_field_id, req.body.value]);
	res.send("done");
});

parts.patch("/:id",(req, res)=>{
	if(!isValidColumn(req.body.field, partsColumns)){
		res.send("error");
		return;
	}
	let q = sql.format("UPDATE parts SET ?? = ? WHERE id=?", [req.body.field, req.body.value, req.params.id]);
	con.query(q, (err, result)=>{
		if(err){
			res.send("error");
			return;
		}
		res.send("done");
	});
});

parts.delete("/:id", (req, res)=>{
	con.query("DELETE FROM parts WHERE id=?", [req.params.id], (err, result)=>{
		if(err){throw err}
		console.log("a part was deleted!");
		res.send("done");
	});
});
//------------------------
/*End of: /parts endpoint*/
//------------------------
