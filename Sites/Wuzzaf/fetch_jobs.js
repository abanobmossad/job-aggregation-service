const request = require('request-promise');
const cheerio = require("cheerio");


/**
 * @description fetch all the job links in single page
 * @param pageUri: the jobs page uri
 * @callback :Save return the found jobs one by one 
 */
// request the wuzzaf site and scribing it 
async function fetchPage(pageUri, save, callback) {

    var options = {
        uri: pageUri,
        transform: function (body) {
            return cheerio.load(body); // to scrap the page (like JQuery)
        }
    };
    request(options).then(function ($) {
        // number of all opened jobs
        var no_of_jobs = $('p.no-of-jobs').text();
        //job details list
        $('h2.job-title').find('a').each((index, element) => {
            let jobUri = $(element).attr("href");
            // redirect to job details page and fetch data
            fetchJob(encodeURI(jobUri), save); // encode the Arabic characters
        });
        try {
            callback(no_of_jobs)
        } catch (e) {}
    }).catch(err => {
        console.log(err);
    });
}

/**
 * @description fetch the job details (single job)
 * @param jobUri :string the url (slug) of the job
 * @callback save : return the found job 
 */
function fetchJob(jobUri, save) {
    var options = {
        uri: jobUri,
        transform: function (body) {
            return cheerio.load(body);
        }
    };
    return request(options).then(function ($) {
        let job = Object.create(null);
        // basics 
        job.title = $("h1.job-title").find('meta').attr("content");
        job.company_location = $("span.job-company-location").find("span[itemprop='addressRegion']").text();
        job.company_name = $("a.job-company-name").text();
        job.datePosted = $("time[itemprop='datePosted']").attr("title");
        job.applicants_num = $('div.applicants-num').text().trim() || "0";
        //more details
        let demands = Object.create(null);
        $(".table").find('dl').each((index, element) => {
            let key = $(element).find("dt").text().trim().replace(":", '');
            let value = $(element).find("dd").text().trim().replace(/(\r\n\t|\n|\r\t|\s{5,}|\\)/gm, " ");
            demands[key] = value;
        })
        job.demands = demands;
        job.desc = $("span[itemprop='description']").text();
        job.requirements = $("span[itemprop='responsibilities']").text();
        job.originalLink=jobUri
        // console.log(job.title);
        // console.log("---------------------------------------------");
        // save the job in the DataBase 
        save(job)
    }).catch(err => {
        console.log(err);
    });
}

/**
 * @description run the script to scraping all site pages 
 * @param last :boolean fetch the last 24 hours jobs
 * @callback return the found jobs one by one 
 */
function fetchAll(last, save) {
    let url;
    var counter = 0;
    let clear = setInterval(function () {
        url = !last ? `https://wuzzuf.net/search/jobs?start=${counter}` :
            `https://wuzzuf.net/search/jobs?start=${counter}&filters%5Bpost_date%5D%5B0%5D=Past%2024%20Hours`;
        fetchPage(url, save, (noj) => {
            if (!noj) {
                clearInterval(clear)
            }
        })
        counter += 20;
    }, 1000);
}

module.exports = {
    fetchAll,
    fetchJob,
    fetchPage
}