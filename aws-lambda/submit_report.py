import json
import boto3
import uuid
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('WaterloggingReports')
sns = boto3.client('sns')

# SNS TOPIC ARN
SNS_TOPIC_ARN = 'arn:aws:sns:ap-southeast-2:291847158494:MonsoonAlerts'

def lambda_handler(event, context):
    try:
        # ROBUST PARSING: Handles both API Gateway routing methods
        if 'body' in event and event['body'] is not None:
            body = event['body']
            if isinstance(body, str):
                body = json.loads(body)
        else:
            body = event # If no proxy integration, event itself is the payload

        if isinstance(body, str):
            body = json.loads(body)
            
        report_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Calculate TTL (Time-To-Live) for 24 hours from now
        expiration_time = int((datetime.utcnow() + timedelta(days=1)).timestamp())
        
        lat = body.get('lat', 'unknown')
        lng = body.get('lng', 'unknown')
        name = body.get('name', 'Anonymous')
        phone = body.get('phone', 'N/A')
        address = body.get('address', 'No address provided')
        
        # 1. Save to Database with Auto-Delete Timestamp
        item = {
            'ReportID': report_id,
            'Timestamp': timestamp,
            'ExpirationTime': expiration_time, # The TTL trigger
            'Latitude': str(lat),
            'Longitude': str(lng),
            'ReporterName': name,
            'Phone': phone,
            'Address': address
        }
        table.put_item(Item=item)
        
        # 2. Trigger Event-Driven Email Alert
        alert_message = f"""
        🚨 NEW WATERLOGGING ALERT 🚨
        
        Reporter: {name}
        Phone: {phone}
        Address: {address}
        Coordinates: {lat}, {lng}
        Time: {timestamp}
        
        View Map: https://www.google.com/maps/search/?api=1&query={lat},{lng}
        """
        
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"Flood Alert: {address[:20]}...",
            Message=alert_message
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({'message': 'Report saved and authorities notified!', 'id': report_id})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
