const express = require('express')
const request = require('request')
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const fs = require('firebase-admin');



///-----Port-----///
const port = app.listen(process.env.PORT || 4114);
const _urlencoded = express.urlencoded({ extended: false })
app.use(cors())
app.use(express.json())
app.use(express.static('public'));


///----FireStore ----//

const serviceAccount = require('./servicekey.json');

fs.initializeApp({
    credential: fs.credential.cert(serviceAccount)
});

const db = fs.firestore();


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



let _checkoutRequestId, _UserID;
var Username;
///------STK push Activate------/////

app.post('/stk', access, _urlencoded, function(req, res) {

    let _phoneNumber = req.body.phone
    let _Amount = req.body.amount
    _UserID = req.body.user_id
    Username = req.body.User_name

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
                console.log("USER_ID", _UserID);
                console.log("USER_Name", Username);

                _checkoutRequestId = body.CheckoutRequestID;
                console.log("CHECKOUT_ID", _checkoutRequestId);

            }


        })




});
//----MIDDLEWARE---///
const middleware = (req, res, next) => {
    req.checkoutID = _checkoutRequestId;
    req.uid = _UserID;
    req.name = Username;
    next();
};

///------STK_CALLBACK-----///
app.post('/stk_callback', _urlencoded, middleware, function(req, res, next) {
        var transID = '';
        var amount = '';
        var transdate = '';
        var transNo = '';
        let _checkout_ID = req.checkoutID;
        let _Name = req.name;
        let _UID = req.uid;

        console.log('.......... STK Callback ..................');
        if (res.status(200)) {

            console.log("CheckOutId", _checkout_ID)

            res.json((req.body.Body.stkCallback.CallbackMetadata))
            console.log(req.body.Body.stkCallback.CallbackMetadata)

            if (Balance = req.body.Body.stkCallback.CallbackMetadata.Item[2].Name == 'Balance') {

                amount = req.body.Body.stkCallback.CallbackMetadata.Item[0].Value;
                transID = req.body.Body.stkCallback.CallbackMetadata.Item[1].Value;
                transNo = req.body.Body.stkCallback.CallbackMetadata.Item[4].Value;
                transdate = req.body.Body.stkCallback.CallbackMetadata.Item[3].Value;

                db.collection("Payments_backup").doc(transID).set({
                    mpesaReceipt: transID,
                    paidAmount: amount,
                    transNo: transNo,
                    Doc_ID: _UID,
                    checkOutReqID: _checkout_ID,
                    user_Name: _Name,
                    timestamp: transdate,
                }).then((ref) => {
                    console.log("Added doc with ID: ", transID);


                    ///-----Admin section -----//

                    db.collection("Yaya_Employer").doc(_UID).update({
                        preference_count: true,
                        mpesa_receipt: transID,
                        checkOutReqID: _checkout_ID,
                        payment_date: new Date(),
                    }).then((ref) => {
                        console.log("Notification sent", transID);
                    })

                    ////------Close Admin -----////

                });

                db.collection("Yaya_Employer").doc(_UID).collection("Notifications").doc().set({
                    title: "Mpesa payment",
                    desc: _Name + " you have successfully a paid ksh/" + amount,
                    type: "Mpesa payment",
                    to: _UID,
                    from: _UID,
                    timestamp: new Date(),
                }).then((ref) => {
                    console.log("Notification sent", transID);
                });


            } else {

                amount = req.body.Body.stkCallback.CallbackMetadata.Item[0].Value;
                transID = req.body.Body.stkCallback.CallbackMetadata.Item[1].Value;
                transNo = req.body.Body.stkCallback.CallbackMetadata.Item[3].Value;
                transdate = req.body.Body.stkCallback.CallbackMetadata.Item[2].Value;

                db.collection("Payments_backup").doc(transID).set({
                    mpesaReceipt: transID,
                    paidAmount: amount,
                    transNo: transNo,
                    Doc_ID: _UID,
                    checkOutReqID: _checkout_ID,
                    user_Name: _Name,
                    timestamp: transdate,
                    User_id: _UID,
                }).then((ref) => {
                    console.log("Added doc with ID: ", transID);


                    ///-----Admin section -----//

                    db.collection("Yaya_Employer").doc(_UID).update({
                        preference_count: true,
                        mpesa_receipt: transID,
                        checkOutReqID: _checkout_ID,
                        payment_date: new Date(),
                    }).then((ref) => {
                        console.log("Notification sent", transID);
                    })

                    ////------Close Admin -----////

                });

                db.collection("Yaya_Employer").doc(_UID).collection("Notifications").doc().set({
                    title: "Mpesa payment",
                    desc: _Name + " you have successfully a paid ksh/" + amount,
                    type: "Mpesa payment",
                    to: _UID,
                    from: _UID,
                    timestamp: new Date(),
                }).then((ref) => {
                    console.log("Notification sent", transID);
                });


            }





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



///-------  Stk Registration-----////
let _BfName,_BureauImage,_BureauName,_BIdNo,
_BBuilding,_BStreetName,_BCity,_BCounty,_BEmail,_BBox,
_BPostalCode,_BPhone,_BAmount,_BUiD;
let _CheckoutRequestId;

app.post('/stk_register', access, _urlencoded, function(req, res) {

    
  
    _BPhone = req.body.Phone_NO;
    _BAmount = req.body.amount;
    _BUiD = req.body.user_id;
    _BfName = req.body.Name;
    _BureauName = req.body.Bureau_Image;
    _BureauImage = req.body.Bureau_Image;
    _BIdNo = req.body.ID_no;
    _BBuilding = req.body.Building;
    _BStreetName = req.body.Street_name;
    _BCity = req.body.City;
    _BCounty = req.body.County;
    _BEmail = req.body.Email;
    _BBox = req.body.Box_No;
    _BPostalCode = req.body.Postal_code;


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
                "Amount": _BAmount,
                "PartyA":_BPhone,
                "PartyB": _shortCode, //Till  No.
                "PhoneNumber": _BPhone,
                "CallBackURL": "https://70aa-154-153-49-51.ngrok.io/stk_callback2",
                "AccountReference": "YayaNanies ",
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
                console.log("USER_ID", _UserID);
                console.log("USER_Name", Username);
                _CheckoutRequestId = body.CheckoutRequestID;
                console.log("CHECKOUT_ID", _CheckoutRequestId);

            }


        })




});
//----MIDDLEWARE---///
const middleware2 = (req, res, next) => {
    req.checkoutID = _CheckoutRequestId;
    req.uid = _BUiD;
    req.name = _BfName;
    req.idNo = _BIdNo;
    req.bureauName = _BureauName;
    req.bureauImage = _BureauImage;
    req.building = _BBuilding;
    req.streetName = _BStreetName;
    req.city = _BCity;
    req.county = _BCounty;
    req.email = _BEmail;
    req.boxNo = _BBox;
    req.postalCode = _BPostalCode;
    req.phoneNo = _BPhone;
    next();
};

///------STK_CALLBACK-----///
app.post('/stk_callback2', _urlencoded, middleware2, function(req, res, next) {
        var transID = '';
        var amount = '';
        var transdate = '';
        var transNo = '';
        let _checkout_ID = req.checkoutID;
        let _Name = req.name;
        let _UID = req.uid;
        let _BName = req.bureauName;
        let _BImage = req.bureauImage;
        let _IdNo = req.idNo;
        let _Building = req.building;
        let _StreetName = req.streetName;
        let _City = req.city;
        let _County = req.county;
        let _Email = req.email;
        let _BoxNo = req.boxNo;
        let _PostalCode = req.postalCode;
        let _PhoneNo = req.phoneNo;

        console.log('.......... STK Callback ..................');
        if (res.status(200)) {

            console.log("CheckOutId", _checkout_ID)

            res.json((req.body.Body.stkCallback.CallbackMetadata))
            console.log(req.body.Body.stkCallback.CallbackMetadata)

            if (Balance = req.body.Body.stkCallback.CallbackMetadata.Item[2].Name == 'Balance') {

                amount = req.body.Body.stkCallback.CallbackMetadata.Item[0].Value;
                transID = req.body.Body.stkCallback.CallbackMetadata.Item[1].Value;
                transNo = req.body.Body.stkCallback.CallbackMetadata.Item[4].Value;
                transdate = req.body.Body.stkCallback.CallbackMetadata.Item[3].Value;

                db.collection("Payments_backup").doc(transID).set({
                    mpesaReceipt: transID,
                    paidAmount: amount,
                    transNo: transNo,
                    Doc_ID: _UID,
                    checkOutReqID: _checkout_ID,
                    user_Name: _Name,
                    timestamp: transdate,
                }).then((ref) => {
                    console.log("Added doc with ID: ", transID);


                    ///-----Admin section -----//

                    db.collection("Yaya_Bureau").doc(_UID).update({
                        preference_count: true,
                        mpesa_receipt: transID,
                        checkOutReqID: _checkout_ID,
                        Name:_Name,
                        Bureau_Name:_BName,
                        Bureau_Image:_BImage,
                        ID_no:_IdNo,
                        Building:_Building,
                        Street_name:_StreetName,
                        City:_City,
                        County:_County,
                        Email:_Email,
                        Box_No:_BoxNo,
                        Postal_code:_PostalCode,
                        Phone_NO:_PhoneNo,
                        No_of_candidates:0,
                        RegistrationFee:amount,
                        timestamp: new Date(),
                    }).then((ref) => {
                        console.log("Notification sent", transID);
                    })

                    ////------Close Admin -----////

                });

                db.collection("Yaya_Bureau").doc(_UID).collection("Notifications").doc().set({
                    title: "Mpesa payment",
                    desc: _Name + " you have successfully a paid ksh/" + amount,
                    type: "Mpesa payment",
                    to: _UID,
                    from: _UID,
                    timestamp: new Date(),
                }).then((ref) => {
                    console.log("Notification sent", transID);
                });


            } else {

                amount = req.body.Body.stkCallback.CallbackMetadata.Item[0].Value;
                transID = req.body.Body.stkCallback.CallbackMetadata.Item[1].Value;
                transNo = req.body.Body.stkCallback.CallbackMetadata.Item[3].Value;
                transdate = req.body.Body.stkCallback.CallbackMetadata.Item[2].Value;

                db.collection("Payments_backup").doc(transID).set({
                    mpesaReceipt: transID,
                    paidAmount: amount,
                    transNo: transNo,
                    Doc_ID: _UID,
                    checkOutReqID: _checkout_ID,
                    user_Name: _Name,
                    timestamp: transdate,
                    User_id: _UID,
                }).then((ref) => {
                    console.log("Added doc with ID: ", transID);


                    ///-----Admin section -----//

                    db.collection("Yaya_Employer").doc(_UID).update({
                        preference_count: true,
                        mpesa_receipt: transID,
                        checkOutReqID: _checkout_ID,
                        payment_date: new Date(),
                    }).then((ref) => {
                        console.log("Notification sent", transID);
                    })

                    ////------Close Admin -----////

                });

                db.collection("Yaya_Employer").doc(_UID).collection("Notifications").doc().set({
                    title: "Mpesa payment",
                    desc: _Name + " you have successfully a paid ksh/" + amount,
                    type: "Mpesa payment",
                    to: _UID,
                    from: _UID,
                    timestamp: new Date(),
                }).then((ref) => {
                    console.log("Notification sent", transID);
                });


            }





        }

    })
    ///----STK QUERY ---//
app.post('/stk/query2', access, _urlencoded, function(req, res, next) {

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