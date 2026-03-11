import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  type Relation
} from 'typeorm'
import { Todo } from './Todo.entity'
import { Label } from './Label.entity'

@Entity('emails')
@Index(['date'])
@Index(['isProcessed'])
@Index(['sender'])
export class Email {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  sender!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  snippet!: string | null

  @Column({ type: 'text', nullable: true })
  bodyText!: string | null

  @Column({ type: 'boolean', default: false })
  hasAttachments!: boolean

  @Column({ type: 'datetime' })
  date!: Date

  @Column({ type: 'boolean', default: false })
  isProcessed!: boolean

  @Column({ type: 'boolean', default: false })
  isSpam!: boolean

  @OneToMany(() => Todo, (todo) => todo.email)
  todos!: Relation<Todo[]>

  @OneToMany(() => Label, (label) => label.email)
  labels!: Relation<Label[]>
}