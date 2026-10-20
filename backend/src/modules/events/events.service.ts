import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventsService {
  // ponytail: in memory, so it assumes one API process; use Postgres LISTEN/NOTIFY if the API ever runs several.
  readonly changes = new Subject<void>();
}
