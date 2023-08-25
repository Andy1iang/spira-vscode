"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
const vscode = require("vscode");
// The module 'superagent' is used to make API calls to Spira Rest Web Service
const superagent = require("superagent");
// The module 'uri' is used to get icons for Artifacts
const vscode_1 = require("vscode");
// This method is called when extension is activated
async function activate(context) {
    //variable to store if the user has been verified
    var verified = false;
    //url, username, and API token are used to verify the user
    var url;
    var username;
    var token;
    ;
    var projectList = {};
    ;
    var incidents = [];
    var tasks = [];
    var requirements = [];
    //array holding project names
    var projectNames = [];
    //variable to hold the project user chooses when adding projects (may be deleted and moved to local scope)
    var chosenProject;
    //command to verify the user credentials: Verify Credentials)
    let verifyCred = vscode.commands.registerCommand('tempextdemo.verifyCred', async () => {
        //prompting the user to enter their url
        url = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "http://doctor/SpiraPlan",
            prompt: "Base URL for accessing Spira Please omit the last slash as shown above ex. https://example.com/example/Spira",
        });
        //prompting the user to enter their username
        username = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "fredbloggs",
            prompt: "Please enter your Spira username",
        });
        //prompting the user to enter their API token
        token = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}",
            prompt: "Marked 'RSS Token' in your profile, RSS Feeds must be enabled for this to work",
        });
        //testing whether the user can be authenticated
        try {
            await superagent.get(`${url}/Services/v7_0/RestService.svc/projects?username=${username}&api-key=${token}`);
            vscode.window.showInformationMessage('Credentials Are Verified');
            verified = true;
            //retrieving Artifacts
            tasks = await retrieveInfo('Task');
            incidents = await retrieveInfo('Incident');
            requirements = await retrieveInfo('Requirement');
            //Creating the sidebar information
            vscode.window.registerTreeDataProvider('testing-extension', new TreeDataProvider(requirements, tasks, incidents));
        }
        catch {
            //Showing error message if credentials cannot be verified
            vscode.window.showErrorMessage('Credentials Cannot Be Verified, Please Try Again');
        }
    });
    //Command to let user add Tasks to their Spira account: (Add Task)
    let addTask = vscode.commands.registerCommand('tempextdemo.addTask', async () => {
        //only works if the user is verified first
        if (verified) {
            //prompting the user to enter task name to be created
            let taskName = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: "Develop New System",
                prompt: 'Enter Your Task Name:'
            });
            //getting project list to show in dropdown
            await retrieveProjects(url, username, token);
            //prompting the user to choose which project to add task in
            chosenProject = await vscode.window.showQuickPick(projectNames, {
                ignoreFocusOut: true,
                placeHolder: "Select a project to create the task in"
            }) ?? ""; //circumvents the type error warning
            //posts the task onto Spira
            try {
                await superagent.post(`${url}/Services/v7_0/RestService.svc/projects/${projectList[chosenProject]}/tasks?username=${username}&api-key=${token}`)
                    .send({ TaskId: null, TaskStatusId: 1, TaskTypeId: 1, Name: taskName }); //TaskId, TaskStatusId, and TaskTypeId are all defaults
                vscode.window.showInformationMessage('Task Added Successfully');
            }
            catch (error) {
                //Shows Error Message
                vscode.window.showErrorMessage('An Error Occurred');
            }
        }
        else {
            //If user has not verified credentials yet
            vscode.window.showErrorMessage('Please Verify Your Credentials First');
        }
    });
    // Command to let user reload their information
    let reloadInfo = vscode.commands.registerCommand('tempextdemo.reloadInfo', async () => {
        if (verified) {
            //retrieving (reloading) projects
            retrieveProjects(url, username, token);
            //retrieving (reloading Artifacts)
            tasks = await retrieveInfo('Task');
            incidents = await retrieveInfo('Incident');
            requirements = await retrieveInfo('Requirement');
            //reloading the sidebar display
            vscode.window.registerTreeDataProvider('testing-extension', new TreeDataProvider(requirements, tasks, incidents));
            vscode.window.showInformationMessage('Refreshed');
        }
    });
    //adding commands so they are unloaded when extension is deactivated
    context.subscriptions.push(verifyCred);
    context.subscriptions.push(addTask);
    context.subscriptions.push(reloadInfo);
    //helper function to retrieve lists of projects the user can see
    async function retrieveProjects(url, username, token) {
        let tempProjects = await superagent.get(`${url}/services/v7_0/RestService.svc/projects?username=${username}&api-key=${token}`)
            .set('Content-Type', 'application/json').set('accept', 'application/json');
        for (let i = 0; i < tempProjects.body.length; i++) {
            //adding fields to key value pairs and array (for dropdown menu when adding tasks)
            projectList[tempProjects.body[i].Name] = tempProjects.body[i].ProjectId;
            projectNames.push(tempProjects.body[i].Name);
        }
    }
    //helper function to retrieve information (tasks, incidents, & requirements) to be displayed
    // async function retrieveInfo(infoType:string|undefined, infoList:Info[]){
    async function retrieveInfo(infoType) {
        //infoType should either be 'Task', 'Incident', or 'Requirement'
        let tempList = [];
        //Making API call to get information 
        let tempData = await superagent.get(`${url}/services/v7_0/RestService.svc/${infoType}s?username=${username}&api-key=${token}`)
            .set('Content-Type', 'application/json').set('accept', 'application/json');
        //Storing Artifact information in an array of Objects (each one represents a data field)
        for (let i = 0; i < tempData.body.length; i++) {
            let tempInfo = {};
            tempInfo['ID'] = tempData.body[i][`${infoType}Id`];
            tempInfo['Name'] = tempData.body[i]['Name'];
            tempInfo['Product'] = tempData.body[i]['ProjectName'];
            tempInfo['Type'] = tempData.body[i][`${infoType}TypeName`];
            tempInfo['Status'] = tempData.body[i][`${infoType}StatusName`];
            tempInfo['Description'] = tempData.body[i]['Description'];
            tempInfo['URL'] = `${url}/${tempData.body[i]['ProjectId']}/${infoType}/${tempData.body[i][tempInfo['ID']]}.aspx`;
            //Appending to the array
            tempList.push(tempInfo);
        }
        return tempList;
    }
}
exports.activate = activate;
// This method is called when extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
// For displaying the sidebar (treeview - aka dropdowns )
class TreeDataProvider {
    //taking in Artifact Information
    constructor(requirements, tasks, incidents) {
        this.header = [];
        //Adding requirements to Dropdown (TreeItem)
        let rqList = [];
        for (let i = 0; i < requirements.length; i++) {
            let temprq = new TreeItem(`${requirements[i]['Name']} - [RQ:${requirements[i]['ID']}]`);
            temprq.iconPath = vscode_1.Uri.parse("https://raw.githubusercontent.com/Inflectra/spira-vscode/master/media/spira-requirement.png");
            rqList.push(temprq);
        }
        this.rq = new TreeItem(`REQUIREMENTS (${requirements.length})`, rqList);
        //Adding tasks to Dropdown (TreeItem)
        let tkList = [];
        for (let i = 0; i < tasks.length; i++) {
            let temptk = new TreeItem(`${tasks[i]['Name']} - [TK:${tasks[i]['ID']}]`);
            temptk.iconPath = vscode_1.Uri.parse("https://raw.githubusercontent.com/Inflectra/spira-vscode/master/media/spira-task.png");
            tkList.push(temptk);
        }
        this.tk = new TreeItem(`TASKS (${tasks.length})`, tkList);
        //Adding incidents to Dropdown (TreeItem)
        let inList = [];
        for (let i = 0; i < incidents.length; i++) {
            let tempin = new TreeItem(`${incidents[i]['Name']} - [IN:${incidents[i]['ID']}]`);
            tempin.iconPath = vscode_1.Uri.parse("https://raw.githubusercontent.com/Inflectra/spira-vscode/master/media/spira-incident.png");
            ;
            inList.push(tempin);
        }
        this.in = new TreeItem(`INCIDENTS (${incidents.length})`, inList);
        this.header.push(this.tk);
        this.header.push(this.in);
        this.header.push(this.rq);
    }
    //Helper code taken from: https://stackoverflow.com/questions/56534723/simple-example-to-implement-vs-code-treedataprovider-with-json-data
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element === undefined) {
            return this.header;
        }
        return element.children;
    }
}
//Helper code taken from: https://stackoverflow.com/questions/56534723/simple-example-to-implement-vs-code-treedataprovider-with-json-data
class TreeItem extends vscode.TreeItem {
    constructor(label, children) {
        super(label, children === undefined ? vscode.TreeItemCollapsibleState.None :
            vscode.TreeItemCollapsibleState.Collapsed); //Dropdown is first set to collapsed state
        this.children = children;
    }
    setLabel(label) {
        this.label = label;
    }
    setChildren(children) {
        this.children = children;
    }
}
//# sourceMappingURL=extension.js.map