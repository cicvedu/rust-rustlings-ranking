import { Octokit } from "octokit";
import { assignment, AUTH_TOKEN, fullOrganization, JsonData, organiztion, SESSION_TOKEN, works } from "./config";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import { addStudentInfo} from "./utils";
import { writeFileSync } from 'fs';
import { initDatabase, shouldUpdateStudent, updateGrades } from "./utils/GradeStorage";

const octokit = new Octokit({
    auth: AUTH_TOKEN
})

// const proxyAgent = new HttpsProxyAgent('http://172.20.144.1:7890');

/**
 * Get the info of the assignment
 * @param {string} classroom The full name of the classroom. Note: It should be got in the url.
 * @param {string } assigment The assignment' name
 * @param {string} sessionToken Session token for the account that is the owner of the classroom
 * @returns The info of the assignment. It contains a list of students and their details. 
 */
async function fetchAssignments(classroom: string, assigment: string, sessionToken: string) {
    return new Promise<string>(async (resolve, reject) => {
        const url = `https://classroom.github.com/classrooms/${classroom}/assignments/${assigment}/download_grades`
        // Send a Get request
        const response = await fetch(url, {
            headers: {
            accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'if-none-match': 'W/"91c8c819008d409c96ac22f96ff4029d"',
            'sec-ch-ua': '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            cookie:
                `_github_classroom_session=${sessionToken}`
            },
            // referrerPolicy: 'strict-origin-when-cross-origin',
            // body: null,
            method: 'GET',
            // agent: proxyAgent
        })
    
        // If it get the result successfully.
        if (response.ok) {
            resolve(await response.text())
        } else {
            reject(`download fail: ${url}`)
        }
    })
}

/**
 * Decode the log file.
 * @param fileObject It's a file object obtained by the function getRepoLogFile.
 * @returns The value of the file.
 */
function decodeLogFile(fileObject: any) {
    let data = fileObject.data['content' as keyof typeof fileObject.data];
    let encoding = fileObject.data['encoding' as keyof typeof fileObject.data];
    let buff = Buffer.from(data, encoding);
    return buff.toString('utf8'); 
}

/**
 * Get the log file object in the repository.
 * @description By default, gh-pages branch is used, and only files in the root directory can be got.
 * @param githubUsername The github username of the student who completed the assignment.
 * @param filename The file's name in the student repository.
 * @returns The file object contains the file info and more details
 */
async function getRepoLogFile(githubUsername: string, filename: string) {
    try {
        return await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: organiztion,
            repo: `${assignment}-${githubUsername}`,
            path: filename,
            ref: 'gh-pages'
        });
        
    } catch (error) {
        return undefined;
    }
}

/**
 * Get the usage of the api
 * @function getApiRemaining
 */
async function getApiRemaining() {
    let response = await octokit.request('GET /rate_limit', {})
    console.log('') // print a blank line
    console.log("API详情 " + JSON.stringify(response.data.rate));
}

/**
 * get the grade of the student with list of classroom xml
 */
async function getGrade() {
    let value = await fetchAssignments(fullOrganization, assignment, SESSION_TOKEN ?? "");

    let repos = parse(value, {
        columns: true, skip_empty_lines: true, trim: true
    })

    for(let repo of repos) {
        try {
            // Get the student's github username
            let githubUsername: string = repo['github_username'];

            // Get userinfo
            let userInfo = await octokit.request('GET /users/{username}', { username: githubUsername});
            
            let student = {
                name: userInfo['data']['login'],
                avatar: userInfo['data']['avatar_url'],
                repo_url: repo['student_repository_url'],
                grades: { main: repo['points_awarded'] },
                details: ""
            };
            addStudentInfo(student);
        } catch(e) {
            continue;
        }
    }
}

initDatabase()
.then(async () => await getGrade())
.then(async () => await getApiRemaining())
.then(() => {
    let t = shouldUpdateStudent("yfblock");
    console.log(t);
    // Save json data to file.
    writeFileSync('../web/src/data.json', JSON.stringify(JsonData))
})
