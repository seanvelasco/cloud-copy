# cc-to-cloud

## Usage

Append the URL of the target media to be uploaded as the value to the query parameter `upload`

```
https://cc.sean.ph/?upload=URL
```

## Example

```
https://cc.sean.ph/?upload=https://newsinfo.inquirer.net/1593333/robredo-rareforce-and-flair-of-a-peoples-campaign
```
The above will upload the media to `cc.sean.ph` and return the URL of the copied media in the response body

```
{
    "success": true,
    "message": "https://newsinfo.inquirer.net/1593333/robredo-rareforce-and-flair-of-a-peoples-campaign uploaded successfully",
    "href": "https://cc.sean.ph/113c8a1b-61f4-4275-9b41-c5908c7d012e"
}
```
The resulting `href` will resolve to the copy of the target media
```
https://cc.sean.ph/113c8a1b-61f4-4275-9b41-c5908c7d012e
```

## Acknowledgements

Special thanks to Cloudflare for granting closed beta access to Cloudflare R2

## Author

[Sean Velasco](https://seanvelasco.com)