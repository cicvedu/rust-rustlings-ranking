import * as dotenv from "dotenv";

export const config = dotenv.config();

export const organiztion: string = 'cicvedu';            // 组织
export const fullOrganization: string = '119796606-cicv-rust-classroom'; // classroom名称
export const assignment = 'rust-rustlings';   // assignment
export const works = ['main']; // assignment 的不同情况
export const AUTH_TOKEN = process.env['TOKEN'];
export const SESSION_TOKEN = process.env['SESSION_TOKEN'];

// JsonData store the grades and the other info.
export let JsonData: ResultObject = {
    available: {},
    // grades has the tree. grades --> studentGithubUsername --> workName --> grade
    students: [],
    // the list of questions
    questions: [],
    // latest update time
    latestUpdatedAt: Date.now()
}


// initialize the JsonData by works
for(let work of works) {
    JsonData['available'][work] = 0;
} 
