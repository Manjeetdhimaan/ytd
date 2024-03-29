const express = require('express');
const router = express.Router();
const fs = require('fs');
const ytdl = require('ytdl-core');
const nodemailer = require('nodemailer');
const UserContact = require('../model/UserContact');
const ejs = require('ejs');
//Set YTDL_NO_UPDATE to disable update check for all uses of ytdl-core
process.env.YTDL_NO_UPDATE = '1';


//Serve the index page
router.get('/', (req, res) => {
  return res.render('VideoConverter', {
    title: 'Video Converter And Downloader | Youtube Converter',
    video: null,
    message: null,
    path: '/'
  });
});

//for vdeo page
router.get('/audio-convertor', (req, res) => {
  return res.render('index', {
    title: 'YouTube to MP3 Converter | Youtube Converter',
    message: null,
    audioQualities: [],
    path: '/audio-convertor'
  });
});

//terms page
router.get('/terms', async (req, res) => {
  return res.render('terms', {
    title: 'Terms and Conditions | Youtube Converter',
    path: '/terms'
  });
});

//privacy page
router.get('/privacy', async (req, res) => {
  return res.render('privacy-policy', {
    title: 'Privacy And Policies | Youtube Converter',
    path: '/privacy'
  });
});

//About Us Page
router.get('/about-us', (req, res) => {
  return res.render('AboutUs', {
    title: 'About Us | Youtube Converter',
    path: '/about-us'
  });
});

//Contact Us Page
router.get('/contact-us', (req, res) => {
  return res.render('ContactUs', {
    title: 'Contact Us | Youtube Converter',
    message: null,
    path: '/contact-us'
  });
});

// for url routes and function-/ _---------_ Audio Converter--------------------------------------// route for downloading audio in different qualities


//Routes for Audio Converter
router.get('/convert-audio', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!ytdl.validateURL(videoUrl)) {
      return res.render('index', {
        audioQualities: [],
        title: 'Video Converter And Downloader | Youtube Converter',
        message: 'Please Enter A Valid Youtube URL',
        path: '/convert-audio'
      });
    }
    const audioFormats = await ytdl.getInfo(videoUrl);

    const audioQualities = audioFormats.formats
      .filter((format) => {
        return format.mimeType.includes('audio/') && format.audioBitrate;
      })
      .map((format) => {
        console.log("format", format)
        return {
          bitrate: format.audioBitrate,
          mimeType: 'mp3' || format.mimeType,
          extension: 'mp3' || format.ext,
          url: format.url
        };
      });

    if (audioQualities.length === 0) {
      return res.render('index', {
        audioQualities: [],
        title: 'YouTube to MP3 Converter | Youtube Converter',
        message: 'No audio found for the given link.',
        path: '/'
      });
    }

    return res.render('index', {
      audioQualities: audioQualities,
      title: 'YouTube to MP3 Converter | Youtube Converter',
      message: 'Converted successfully',
      path: '/'
    });
  } catch (error) {
    console.error(error, 'ERROR IN VIDEO CONVERT TO AUDIO');
    return res.render('PageNotFound', {
      title: 'Page Not Found | 404 ',
      message: `Oops! Error:${error.message}`,
      path: '/'
    });
  }
});

// _____________________ FOR VIDEO _________________________________

// Set up the POST request route to convert the YouTube link to video
router.post('/convert-video', async (req, res) => {
  const url = req.body.url;
  if (!ytdl.validateURL(url)) {
    return res.render('VideoConverter', {
      video: null,
      title: 'Video Converter And Downloader | Youtube Converter',
      message: 'Please Enter A Valid Youtube URL'
    });
  }
  const info = await ytdl.getInfo(url);
  const video = {
    title: info.videoDetails.title,
    url: url,
    thumbnail: info.videoDetails.thumbnails[0].url,
    formats: info.formats.filter(format => format.container),
  };

  return res.render('VideoConverter', {
    video: video,
    title: 'Video Converter And Downloader | Youtube Converter',
    message: 'Converted Successfully , Please Download',
    path: '/'
  });
});

// Set up the GET request route to download the selected video format
router.get('/download-video', async (req, res) => {
  try {
    const url = req.query.url;
    const format = 'mp4' || req.query.format;
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title;
    const videoFileName = `${videoTitle}.${format}`;
    const videoStream = ytdl(url, {
      format: format
    });
    const contentDispositionHeader = `attachment; filename*=UTF-8''${encodeURIComponent(videoFileName)}`;
    res.setHeader('Content-Disposition', contentDispositionHeader);
    res.setHeader('Content-Type', 'video/mp4');
    videoStream.pipe(res);
  } catch (error) {
    console.log('Error In Download:', error);
    return res.render('PageNotFound', {
      title: 'Page Not Found | 404 ',
      message: `Oops! Error:${error.message}`,
      path: '/convert-audio'
    });
  }
});


// email template load from viewfiles for password reset
const successEmail = fs.readFileSync('./project_views/ContactSuccess/SuccessEmail.ejs', 'utf-8');

// Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER_EMAIL,
    pass: process.env.SMTP_USER_PASSWORD
  },
  secure: process.env.SECURE_SMTP,
});

// form submition 

router.post('/send-contact-form', async (req, res) => {
  try {

    const {
      name,
      email,
      message
    } = req.body;
    // const isMessage = await UserContact.findOne({
    //   message
    // });
    // if (isMessage) {
    //   return res.render('ContactUs', {
    //     title: 'Contact Us | Youtube Converter',
    //     message: 'This Message Already Sent ,Send New Message Please.',
    //     path: '/contact-us'
    //   });
    // }
    const newMessage = new UserContact({
      name,
      email,
      message
    });
    await newMessage.save();
    const renderedTemplate = ejs.render(successEmail, {
      newMessage
    });
    // Construct the password reset email
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL,
      to: [newMessage.email],
      subject: `Contact Submitted Successfull`,
      html: renderedTemplate
    };
    // Send the email
    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        return res.render('PageNotFound', {
          title: 'Page Not Found | 404 ',
          message: `Oops! Error:${err.error.message}`
        });
      } else {
        return res.render('ContactUs', {
          title: 'Contact Us | Youtube Converter',
          message: 'Successfully Submitted Contact Form.',
          path: '/send-contact-form'
        });
      }
    });
  } catch (error) {
    console.log('An error occurred: ' + error.message);
    return res.render('PageNotFound', {
      title: 'Page Not Found | 404 ',
      message: `Oops! Error:${error.message}`,
      path: '/not-found'
    });
  }
});

module.exports = router;