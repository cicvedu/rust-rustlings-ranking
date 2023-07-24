import { Octokit } from "octokit";
import { assignment, AUTH_TOKEN, fullOrganization, JsonData, organiztion, SESSION_TOKEN, works } from "./config";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parse } from "csv-parse/sync";
import { addStudentInfo, buildEmptyGrades, updateAvailable, updateQuestions } from "./utils";
import { writeFileSync } from 'fs';

const octokit = new Octokit({
    auth: AUTH_TOKEN
})

const grades: any = {};

// const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:7890');

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
        console.log(`fetch ${url}`);
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
            const text = await response.text()
            // console.log('classroom response text: ' + text)
            resolve(text)
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
 * Get the grade of works and combine them.
 * @param githubUsername The github username of the student who completed the assignment.
 * @param latest The value of the latest.json. It should be a json string.
 * @returns Json object contains work and its points.
 */
async function getWorksGrade(githubUsername: string, latest: any) {
    let grade = buildEmptyGrades();
    let gradeDetails: any = {};
    if(!latest) {
        console.log(`${githubUsername.padEnd(15)} 没有找到latest.json文件   没有分数`);
        return [grade, gradeDetails];
    }

    let file = JSON.parse(decodeLogFile(latest));
    for(let work of works) {
        // If it not has the log file, then continue.
        if(!file[work]) continue;

        // Get the value of the work's log file.
        let logFile = await getRepoLogFile(githubUsername, file[work]);
        let gradeFile = decodeLogFile(logFile);

        // Handle the result
        let index = gradeFile.lastIndexOf('Points: ');
        let pointString = gradeFile.substring(index).replace('Points: ', '');
        let points = pointString.split('/').map((item: string, _index: number)=>parseFloat(item));
        
        // Get Details Grade
        let gradeDetailsOutput = gradeFile.substring(0, index).trim();
        let details:any = {};   // details grade
        gradeDetailsOutput.split('\n').forEach((value: string) => {
            if(value.startsWith('✅')) {
                let title = value.replace('pass', '').substring(2).trim();
                details[title] = true;
            } else if (value.startsWith('❌')) {
                let title = value.replace(/\spoints\s\d+\/\d+/, '').substring(2).trim();
                details[title] = false;
            }
        });

        // Update available points by work name.
        updateAvailable(work, points[1]);

        // Update the list of questions
        updateQuestions(Object.keys(details));

        // Store grade to points variable.
        if(work in grade) {
            grade[work] = points[0];
            gradeDetails[work] = details;
        }
        console.log(`${githubUsername.padEnd(15)} ${points}`)
    }
    return [grade, gradeDetails];
}


async function getGrade() {
    console.log("start to download grades....");
    let value = await fetchAssignments(fullOrganization, assignment, SESSION_TOKEN ?? "");

    let repos = parse(value, {
        columns: true, skip_empty_lines: true, trim: true
    })

    console.log("fetch ok");

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
                details: "",
                lastUpdateAt: new Date(repo['submission_timestamp']).getTime()
            };
            console.log(student);
            addStudentInfo(student);
        } catch(e) {
            continue;
        }
    }
}

getGrade().then(()=>getApiRemaining()).then(() => {
    // Save json data to file.
    writeFileSync('../web/src/data.json', JSON.stringify(JsonData))
})
