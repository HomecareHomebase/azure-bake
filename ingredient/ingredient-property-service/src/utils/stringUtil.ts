
export class StringUtils {

    public static ToTitleCase(value: string): string {
        return value.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    }

    public static Base64Decode(value: string | undefined): Uint8Array | undefined {

        if (!value) {
            return undefined;
        }

        const decodedString: string = Buffer.from(value).toString('base64');
        const bytes: Uint8Array = new Uint8Array(decodedString.length);

        for (let i = 0; i < decodedString.length; i++) {
            bytes[i] = decodedString.charCodeAt(i);
        }

        return bytes
    }

}