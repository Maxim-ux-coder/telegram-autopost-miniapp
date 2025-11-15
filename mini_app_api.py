from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import hashlib
import hmac
from urllib.parse import parse_qs

app = Flask(__name__)
CORS(app)

BOT_TOKEN = "8348857691:AAGqwKSdMVCp72HxjE_WsJ8rHuyFtgbnJlc"

import sys
sys.path.append('D:/Automatic post sender')
from second import bot_data, get_user_channel, ALLOWED_USERS

def is_admin(user_id):
    """Check if user is admin"""
    return str(user_id) in [str(u) for u in ALLOWED_USERS]

def verify_telegram_init_data(init_data):
    try:
        parsed_data = parse_qs(init_data)
        hash_value = parsed_data.get('hash', [''])[0]
        
        data_check_string = '\n'.join([
            f"{k}={v[0]}" for k, v in sorted(parsed_data.items()) if k != 'hash'
        ])
        
        secret_key = hmac.new(
            "WebAppData".encode(),
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == hash_value
    except:
        return False

@app.before_request
def verify_request():
    if request.path == '/api/ping':
        return None

@app.route('/api/ping', methods=['POST'])
def ping():
    return jsonify({'success': True, 'message': 'pong'})

@app.route('/api/get_user_data', methods=['POST'])
def get_user_data():
    try:
        data = request.json
        user_id = str(data.get('user_id'))
        
        channel_id = get_user_channel(user_id)
        channels = []
        
        if channel_id:
            channels.append({
                'id': channel_id,
                'title': channel_id,
                'username': channel_id,
                'subscribers': 0,
                'posts': 0,
                'scheduled': len([m for m in bot_data.scheduled_messages.values() if m.get('user_id') == user_id]),
                'sent_total': 0
            })
        
        scheduled = [
            {
                'id': job_id,
                'content': msg_data.get('content', ''),
                'datetime': msg_data.get('datetime', ''),
                'channel_id': msg_data.get('channel_id', ''),
                'created_at': msg_data.get('created_at', '')
            }
            for job_id, msg_data in bot_data.scheduled_messages.items()
            if msg_data.get('user_id') == user_id
        ]
        
        recurring = [
            {
                'id': job_id,
                'content': msg_data.get('content', ''),
                'cron': msg_data.get('cron', ''),
                'channel_id': msg_data.get('channel_id', ''),
                'active': msg_data.get('active', True),
                'created_at': msg_data.get('created_at', ''),
                'recurring': parse_cron_to_recurring(msg_data.get('cron', ''))
            }
            for job_id, msg_data in bot_data.recurring_messages.items()
            if msg_data.get('user_id') == user_id
        ]
        
        stats = {}
        if hasattr(bot_data, 'stats'):
            stats = bot_data.stats.get(user_id, {})
        
        result_stats = {
            'sent_total': stats.get('sent', 0) if isinstance(stats, dict) else 0,
            'is_subscribed': True,
            'is_admin': is_admin(user_id)
        }
        
        return jsonify({
            'success': True,
            'data': {
                'channels': channels,
                'scheduled': scheduled,
                'recurring': recurring,
                'drafts': [],
                'stats': result_stats
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Error in get_user_data: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/schedule_message', methods=['POST'])
def schedule_message():
    try:
        data = request.json
        user_id = str(data.get('user_id'))
        content = data.get('content')
        datetime_str = data.get('datetime')
        channel_id = data.get('channel_id')
        
        import uuid
        from datetime import datetime
        job_id = f"scheduled_{uuid.uuid4().hex[:8]}"
        
        bot_data.scheduled_messages[job_id] = {
            'user_id': user_id,
            'content': content,
            'datetime': datetime_str,
            'channel_id': channel_id,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        bot_data.save_all()
        
        from second import scheduler, send_scheduled_message, application
        from apscheduler.triggers.date import DateTrigger
        from datetime import datetime as dt
        import pytz
        
        schedule_dt = dt.strptime(datetime_str, '%Y-%m-%d %H:%M')
        schedule_dt = pytz.timezone('Asia/Yerevan').localize(schedule_dt)
        
        scheduler.add_job(
            send_scheduled_message,
            DateTrigger(run_date=schedule_dt),
            args=[application, job_id],
            id=job_id,
            replace_existing=True
        )
        
        return jsonify({'success': True, 'data': {'id': job_id}})
        
    except Exception as e:
        import traceback
        print(f"Error in schedule_message: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/create_recurring', methods=['POST'])
def create_recurring():
    try:
        data = request.json
        user_id = str(data.get('user_id'))
        content = data.get('content')
        channel_id = data.get('channel_id')
        recurring = data.get('recurring', {})
        
        cron = convert_to_cron(recurring)
        
        import uuid
        from datetime import datetime
        job_id = f"recurring_{uuid.uuid4().hex[:8]}"
        
        bot_data.recurring_messages[job_id] = {
            'user_id': user_id,
            'content': content,
            'cron': cron,
            'channel_id': channel_id,
            'active': True,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        bot_data.save_all()
        
        from second import scheduler, send_recurring_message, application
        from apscheduler.triggers.cron import CronTrigger
        import pytz
        
        parts = cron.split()
        
        scheduler.add_job(
            send_recurring_message,
            CronTrigger(
                minute=parts[0],
                hour=parts[1],
                day=parts[2],
                month=parts[3],
                day_of_week=parts[4],
                timezone=pytz.timezone('Asia/Yerevan')
            ),
            args=[application, job_id],
            id=job_id,
            replace_existing=True
        )
        
        return jsonify({'success': True, 'data': {'id': job_id}})
        
    except Exception as e:
        import traceback
        print(f"Error in create_recurring: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete_message', methods=['POST'])
def delete_message():
    try:
        data = request.json
        message_id = data.get('message_id')
        message_type = data.get('type')
        
        if message_type == 'scheduled':
            if message_id in bot_data.scheduled_messages:
                del bot_data.scheduled_messages[message_id]
                bot_data.save_all()
                
                from second import scheduler
                if scheduler.get_job(message_id):
                    scheduler.remove_job(message_id)
        
        elif message_type == 'recurring':
            if message_id in bot_data.recurring_messages:
                del bot_data.recurring_messages[message_id]
                bot_data.save_all()
                
                from second import scheduler
                if scheduler.get_job(message_id):
                    scheduler.remove_job(message_id)
        
        return jsonify({'success': True})
        
    except Exception as e:
        import traceback
        print(f"Error in delete_message: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/disconnect_channel', methods=['POST'])
def disconnect_channel():
    try:
        data = request.json
        user_id = str(data.get('user_id'))
        
        from second import set_user_channel
        set_user_channel(user_id, None)
        
        return jsonify({'success': True})
        
    except Exception as e:
        import traceback
        print(f"Error in disconnect_channel: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save_draft', methods=['POST'])
def save_draft():
    try:
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def convert_to_cron(recurring):
    rec_type = recurring.get('type')
    time = recurring.get('time', '12:00')
    hour, minute = time.split(':')
    
    if rec_type == 'daily':
        return f"{minute} {hour} * * *"
    elif rec_type == 'weekly':
        return f"{minute} {hour} * * 1"
    elif rec_type == 'monthly':
        return f"{minute} {hour} 1 * *"
    elif rec_type == 'custom':
        days = ','.join(recurring.get('days', []))
        return f"{minute} {hour} * * {days}"
    
    return f"{minute} {hour} * * *"

def parse_cron_to_recurring(cron):
    if not cron:
        return {'type': 'daily', 'time': '12:00'}
    
    try:
        parts = cron.split()
        minute, hour = parts[0], parts[1]
        time = f"{hour.zfill(2)}:{minute.zfill(2)}"
        
        if parts[2] == '*' and parts[3] == '*' and parts[4] == '*':
            return {'type': 'daily', 'time': time}
        
        if parts[2] == '*' and parts[3] == '*' and parts[4] == '1':
            return {'type': 'weekly', 'time': time}
        
        if parts[2] == '1' and parts[3] == '*' and parts[4] == '*':
            return {'type': 'monthly', 'time': time}
        
        if parts[4] != '*':
            days = parts[4].split(',')
            return {'type': 'custom', 'time': time, 'days': days}
        
        return {'type': 'daily', 'time': time}
    except:
        return {'type': 'daily', 'time': '12:00'}

if __name__ == '__main__':
    from datetime import datetime
    print("🚀 Starting Mini App API Server...")
    print(f"📅 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔗 URL: http://localhost:5000")
    print("✅ Ready!")
    app.run(host='0.0.0.0', port=5000, debug=True)
