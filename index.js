/*
 * (c) Copyright IBM Corp. 2024
 */

'use strict';

const slackToken = process.env.slacktoken;

const slackUserId = 'C07L6QGAHML';

const rcUrl = 'https://nodejs.org/download/rc/';
const nightlyUrl = 'https://nodejs.org/download/nightly/';

async function sendSlackNotification(message) {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: message,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      console.log('Notification sent to Slack.');
    } else {
      console.error('Error sending notification to Slack:', data.error);
    }
  } catch (error) {
    console.error('Error sending notification to Slack:', error);
  }
}

function parseDateFromRelease(releaseName) {
  const dateMatch = releaseName.match(/nightly(\d{8})/);
  if (dateMatch) {
    // eslint-disable-next-line no-unused-vars
    const [_, dateString] = dateMatch;
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}

async function checkForUpdates() {
  try {
    const rcResponse = await fetch(rcUrl);
    const nightlyResponse = await fetch(nightlyUrl);

    const rcText = await rcResponse.text();
    const nightlyText = await nightlyResponse.text();

    const rcReleases = (
      rcText.match(/href="(.*?v\d+\.\d+\.\d+-rc\.\d+\/)"/g) || []
    ).map((match) => match.split('"')[1]);

    const nightlyReleases = (
      nightlyText.match(/href="(v\d+\.\d+\.\d+-nightly\d+[^"]*)\/"/g) || []
    ).map((match) => match.split('"')[1]);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentRcReleases = rcReleases
      .map((release) => ({ release, date: parseDateFromRelease(release) }))
      .filter(
        (item) => item.date && item.date >= oneWeekAgo && item.date <= now
      )
      .sort((a, b) => b.date - a.date);

    const recentNightlyReleases = nightlyReleases
      .map((release) => ({ release, date: parseDateFromRelease(release) }))
      .filter(
        (item) => item.date && item.date >= oneWeekAgo && item.date <= now
      )
      .sort((a, b) => b.date - a.date);
    let message = '';
    if (recentRcReleases.length) {
      const latestRc = recentRcReleases[0].release;
      message += `Latest RC release in the last week: <${rcUrl}${latestRc}|\`${latestRc}\`>\n`;
    }

    if (recentNightlyReleases.length) {
      const latestNightly = recentNightlyReleases[0].release;
      message += `Latest nightly release in the last week: <${nightlyUrl}${latestNightly}|\`${latestNightly}\`>\n`;
    }

    if (message) {
      await sendSlackNotification(message);
    } else {
      console.log('No updates in the last week.');
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

checkForUpdates();
