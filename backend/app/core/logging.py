import logging
import sys
from contextvars import ContextVar
from datetime import datetime
from pythonjsonlogger import jsonlogger
import uuid

# Context variable to store the correlation ID
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="none")

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            log_record['timestamp'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname
        log_record['correlation_id'] = correlation_id_ctx.get()

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    logHandler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s %(correlation_id)s')
    logHandler.setFormatter(formatter)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    logger.addHandler(logHandler)
    
    # Set levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

def get_logger(name: str):
    return logging.getLogger(name)
