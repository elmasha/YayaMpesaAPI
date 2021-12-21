const express = require('express')
const request = require('request')
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const db = require("./firebase/firebaseConnect");


///-----Port-----///
const port = app.listen(process.env.PORT || 4114);
const _urlencoded = express.urlencoded({ extended: false })
app.use(cors())
app.use(express.json())
app.use(express.static('public'));



//----AllOW ACCESS -----//
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization");


    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }


    next();
});

///------STK push ------/////

app.post('/stk', access, _urlencoded, function(req, res) {

    let _phoneNumber = req.body.phone
    let _Amount = req.body.amount
    let _UserID = req.body.user_id

    let endpoint = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    let auth = "Bearer " + req.access_token

    let _shortCode = '174379';
    let _passKey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'


    const timeStamp = (new Date()).toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password =
        Buffer.from(`${_shortCode}${_passKey}${timeStamp}`).toString('base64');


    request({
            url: endpoint,
            method: "POST",
            headers: {
                "Authorization": auth
            },

            json: {

                "BusinessShortCode": _shortCode,
                "Password": password,
                "Timestamp": timeStamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": _Amount,
                "PartyA": _phoneNumber,
                "PartyB": _shortCode, //Till  No.
                "PhoneNumber": _phoneNumber,
                "CallBackURL": "https://yayampesapi.herokuapp.com/stk_callback",
                "AccountReference": "YayaNanies digital Merchants",
                "TransactionDesc": "_transDec"

            }

        },
        (error, response, body) => {

            if (error) {
                console.log(error);
                res.status(404).json(error);

            } else {

                res.status(200).json(body);
                console.log(body);
                console.log("USER_ID", _UserID)



            }


        })




});
//----MIDDLEWARE---///
const middleware = (req, res, next) => {

    next();
};


///------STK_CALLBACK-----///
app.post('/stk_callback', _urlencoded, middleware, function(req, res, next) {
        console.log('.......... STK Callback ..................');
        if (res.status(200)) {

            console.log("CheckOutId", _checkoutID)

            res.json((req.body.Body.stkCallback.CallbackMetadata))
            console.log(req.body.Body.stkCallback.CallbackMetadata)
        }

    })
    ///----STK QUERY ---//
app.post('/stk/query', access, _urlencoded, function(req, res, next) {

    let _checkoutRequestId = req.body.checkoutRequestId

    auth = "Bearer " + req.access_token

    let endpoint = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
    let _shortCode = '174379';
    let _passKey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'

    const timeStamp = (new Date()).toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = Buffer.from(`${_shortCode}${_passKey}${timeStamp}`).toString('base64')


    request({
            url: endpoint,
            method: "POST",
            headers: {
                "Authorization": auth
            },

            json: {

                'BusinessShortCode': _shortCode,
                'Password': password,
                'Timestamp': timeStamp,
                'CheckoutRequestID': _checkoutRequestId

            }

        },
        function(error, response, body) {

            if (error) {

                console.log(error);
                res.status(404).json(body);

            } else {
                res.status(200).json(body);
                console.log(body)
                next()
            }

        })

})




////-----ACCESS_TOKEN-----
app.get('/access_token', access, (req, res) => {

    res.status(200).json({ access_token: req.access_token })

})

function access(res, req, next) {

    let endpoint = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    let auth = new Buffer.from("sf4SHyX9bZJZMetkctEpV6aqULDeoeMT:iiP0V2gPVd8WD0uC").toString('base64');

    request({
            url: endpoint,
            headers: {
                "Authorization": "Basic  " + auth
            }

        },
        (error, response, body) => {

            if (error) {
                console.log(error);
            } else {

                res.access_token = JSON.parse(body).access_token
                console.log(body)
                next()

            }

        }
    )


}
///----END ACCESS_TOKEN--- 






/////-----Home ------/////
app.get('/', (req, res, next) => {
    res.status(200).send("Hello welcome to Yaya Mpesa API")

})





//-- listen
app.listen(port, (error) => {

    if (error) {



    } else {

        console.log(`Server running on port http://localhost:${port}`)

    }


});