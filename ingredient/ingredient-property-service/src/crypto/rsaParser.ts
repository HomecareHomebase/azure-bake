
// // export enum KeyFormat {
// //     Xml = 0,
// // }

// // export enum KeyEncoding {
// //     Text = 0,
// //     Base64 = 1
// // }

// export class RsaParser {

//     //public static ParseXml(value: string, encoding: KeyEncoding): JsonWebKey {
//     public static ParseXml(): JsonWebKey {

//         const rsaXml = require('rsa-xml');

//         // plain text rsa xml key
//         const privateKey = '<RSAKeyValue><Modulus>51l+rhtsFd/CsNoE9Uoduj+KEjwAvafTfb57vev+wovQn7hUDkw9BmUL97RH/sh/nuSvBIwDdeUVSg2Ciz8lNLrf4Y5e2b55KMePsGyHWoZmxinGPS7ur4KJHOfeBa+GxdC8/4pWBJ6E+pBj3dCbPDPKYVz7DQMHdXcQZ4Bq4v8=</Modulus><Exponent>AQAB</Exponent><P>+QvGlLMxjvLhrEf/ZoMuVIAGNq1xzaJmpfBka4t3lcDYGlhQR59vsYaNDl3U43iUYgrXkCmlUgEpyApTKNa/tQ==</P><Q>7c843Eetk3JjxAQD1JPh4C1N6Crx+dX5cIy5gldcd789XzrESgSP8DX7ySjnOeWflDvirGHzaSWvfVi3J5vAYw==</Q><DP>ORDasu4QmAnNbjWdLzc14YToZ5T8s7rXvIRF7mKpxzXGDttXoeHFrS8AmV8kze6uSXzkghMY356GnWDIR15V1Q==</DP><DQ>HyT/dmHwypm1lStNcR64+0oTpO9S53xtgZ78gKR+WLR0Di+9G1CDpVr8kbjIp516C8jYA+mEHmYwGINw4UAVrw==</DQ><InverseQ>RUz0T08x6Rhx8SdLCgPUsMzrJoojB6CNdv2JNpsZ7cgsY508DB00wodBQkzotHbtAXSkUl7gtAr4LiEz5NENzg==</InverseQ><D>IVeOFin16rR20DB+V3BTls89JxdGZLmmatsZkAvONHFHDhstjhP3FZAEPgeu+pgggHYP3UAP6EgC80sS0zO0uOhtPb349e9+6Zxe22aietY1ZlYPOm5v/XlNGfXNed/n8TaBYDpwbvSUL4Oc5xRNyagSlx2/F7Xw4pdBl4poKgU=</D></RSAKeyValue>';

//         const rsa = new rsaXml.RSAXML();
//         rsa.importKey(privateKey);

//         const webKey: JsonWebKey = {
//         }

//         return webKey;
//     }
// }